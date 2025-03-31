import { ExifData } from "/modules/ExifData.mjs";

export function ShrunkedImage(source, maxWidth, maxHeight, quality, options) {
  this.maxWidth = maxWidth;
  this.maxHeight = maxHeight;
  this.imageFormat="image/jpeg";
  this.quality = quality;
  this.options = {
    exif: true,
    orientation: true,
    gps: true,
    resample: true,
    newalgorithm:true,
    contextInfo:true,
    autoResize:false,
    logenabled:false,
    ...options,
  };

  if (source instanceof File) {
    this.objectURL = URL.createObjectURL(source)
    this.sourceURI = new URL(this.objectURL);
    this.basename = source.name;
  }
  if(this.basename.endsWith(".png"))
  {
    this.imageFormat="image/png";
  }
  if (!this.sourceURI) {
    throw new Error("Unexpected source passed to ShrunkedImage");
  }
}

ShrunkedImage.prototype = {
  async resize() {
    let orientation = 0;
    if (this.options.exif && this.imageFormat=="image/jpeg") {
      await this.readExifData();
      if (this.options.orientation && this.exifData) {
        orientation = this.exifData.orientation;
      }
    }
    let image = await this.loadImage();
    let canvas = await this.drawOnCanvas(image, orientation);

    if (this.exifData && this.exifData.exif2 && this.exifData.exif2.a002) {
      this.exifData.exif2.a002.value = canvas.width;
      this.exifData.exif2.a003.value = canvas.height;
    }

    let blob = await this.getBytes(canvas);
    return new File([blob], this.basename, { type: this.imageFormat });
  },
  async readExifData() {
    try {
      let readable;
      if (this.sourceURI.schemeIs("file")) {
        throw new Error("Unexpected source passed to ShrunkedImage");
      } else {
        readable = await Readable(this.objectURL);
      }
      
      this.exifData = new ExifData();
      await this.exifData.read(readable);
    } catch (ex) {
      if (this.options.logenabled)
        console.warn(ex);
      delete this.exifData;
    }
  },
  async loadImage() {
    let done = Promise.withResolvers();
    let image = document.createElement("img");
    image.onload = function() {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=574330#c54
      if (!image.complete) {
        image.src = image.src; // eslint-disable-line no-self-assign
        return;
      }
      done.resolve(image);
    };
    image.onerror = done.reject;
    image.src = this.objectURL;
    return done.promise;
  },
  drawOnCanvas(image, orientation, resample = true) {
    return new Promise(resolve => {
      let ratio = Math.max(1, image.width / this.maxWidth, image.height / this.maxHeight);
      let resampleRatio = 1;
      let newResampling=false;
      if (resample && this.options.resample) {
        resampleRatio = Math.min(ratio, 3);
        if (resampleRatio > 2 && resampleRatio < 3) {
          resampleRatio = 2;
        }
        if(this.options.newalgorithm)
          newResampling=true;  
      }
      //reset resampleRatio to 1 so that most of the old code can still be reused
      let width = Math.floor(image.width / ratio);
      let height = Math.floor(image.height / ratio);
      
      if (orientation == 90 || orientation == 270) {
        [width, height] = [height, width];
      }

      let canvas = document.createElement("canvas");//NS(XHTMLNS, "canvas");
      canvas.width = newResampling ? image.width : (Math.floor(width * resampleRatio));
      canvas.height = newResampling ? image.height : (Math.floor(height * resampleRatio));
      let context = canvas.getContext("2d");
      if (orientation == 90) {
        context.translate(0, canvas.height);
        context.rotate(-0.5 * Math.PI);
      } else if (orientation == 180) {
        context.translate(canvas.width, canvas.height);
        context.rotate(Math.PI);
      } else if (orientation == 270) {
        context.translate(canvas.width, 0);
        context.rotate(0.5 * Math.PI);
      }
      context.drawImage(
        image,
        0,
        0,
        newResampling ? image.width : ((image.width / ratio) * resampleRatio),
        newResampling ? image.height : ((image.height / ratio) * resampleRatio)
      );
      if (resampleRatio > 1 || newResampling) {
        //old algorithm works differently, it starts with an image resized during drawImage
        if(!newResampling)
        {
          let oldData = context.getImageData(0, 0, canvas.width, canvas.height);
          canvas.width = width;
          canvas.height = height;
          let newData = context.createImageData(canvas.width, canvas.height);

          let worker = new Worker("/modules/worker.js");
          worker.onmessage = function(event) {
            context.putImageData(event.data, 0, 0);
            resolve(canvas);
          };
          worker.postMessage({
            oldData,
            newData,
            func:
              resampleRatio == 3
                ? "nineResample"
                : resampleRatio == 2
                ? "fourResample"
                : "floatResample",
            ratio: resampleRatio, // only for floatResample
          });
        }
        else
        {
          //first get the data for full size image then resize the canvas so it reflects target size
          let oldData = context.getImageData(0, 0, canvas.width, canvas.height).data;
          canvas.width = width;
          canvas.height = height;
          let newData = context.createImageData(canvas.width, canvas.height);
          let worker = new Worker("/modules/worker2.js");
          worker.onmessage = function (event) {
            var data = newData.data;
            var length = data.length;
            for (var x = 0; x < length; ++x) {
              data[x] = event.data[x] & 0xFF;
            }
            context.putImageData(newData, 0, 0);
            resolve(canvas);
          }
          worker.postMessage(["setup", image.width, image.height, width, height, 4, true]);
          worker.postMessage(["resize", oldData]);
        }
      } else {
        resolve(canvas);
      }
    });
  },
  getBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        function(blob) {
          try {
            resolve(blob);
          } catch (ex) {
            reject(ex);
          }
        },
        this.imageFormat,
        (this.imageFormat=="image/jpeg")?(this.quality / 100):null
      );
    });
  },
  async estimateSize() {
    let image = await this.loadImage();
    let canvas = await this.drawOnCanvas(image, 0, false);
    let bytes = await this.getBytes(canvas);
    return bytes.size;
  },
};

async function Readable(url) {
  let response = await fetch(url);
  let bytes = await response.arrayBuffer();

  return {
    data: new Uint8Array(bytes),
    pointer: 0,
    read(count) {
      let result;
      if (count) {
        result = this.data.subarray(this.pointer, this.pointer + count);
        this.pointer += count;
      } else {
        result = this.data.subarray(this.pointer);
        this.pointer = this.data.length;
      }
      return result;
    },
    setPosition(position) {
      this.pointer = position;
    },
    close() {
      delete this.data;
    },
  };
}
