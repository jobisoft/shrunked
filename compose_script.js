let config = {
  attributes: false,
  childList: true,
  characterData: false,
  subtree: true,
};
let resizeWhenForwardReply= false;
let logenabled = false;
async function startup(){
  browser.runtime.sendMessage({
    type: "getOptions",
  }).then((response)=>{
    resizeWhenForwardReply=response["resizeInReplyForward"];
    logenabled = response["logenabled"];
    if(resizeWhenForwardReply) 
      parseInlineAtStart();
  })
  
  // Listener to evaluate context clicked elements.
  document.addEventListener("contextmenu", async (e) => {
    let composeContextMenuEntryStatus = {
      disabled: true,
      label: "context.single"
    };
    let target = document.elementFromPoint(
      e.clientX,
      e.clientY,
    );

    if (target?.nodeName == "IMG") {
      if (logenabled) {
        console.log("Context menu on an <IMG>");
      }

      if (imageIsAccepted(target)) {
        if (target.width > 500 || target.height > 500) {
          composeContextMenuEntryStatus.disabled = false;
        } else {
          if (logenabled) {
            console.log("Not resizing - image is too small");
          }
          composeContextMenuEntryStatus.label = "context.tooSmall";
        }
      } else {
        if (logenabled) {
          console.log("Not resizing - image is not JPEG / PNG");
        }
        composeContextMenuEntryStatus.label = "context.tooSmall"
      }
    }

    // Create an identifier on the node, so it can be found later, but clean up
    // the DOM from any earlier actions.
    const selectedNodes = document.querySelectorAll('[data-currently-selected-for-shrunked]');
    selectedNodes.forEach(node => {
      delete node.dataset.currentlySelectedForShrunked;
    });
    target.dataset.currentlySelectedForShrunked = true;
    let file = composeContextMenuEntryStatus.disabled ? null : await getFileFromTarget(target)

    await browser.runtime.sendMessage({
      type: "updateComposeContextMenuEntry",
      composeContextMenuEntryStatus,
      file
    })
  })

  browser.runtime.onMessage.addListener(request => {
    switch (request.type) {
      case "replaceTargetWithFile": {
        let target = document.querySelector('[data-currently-selected-for-shrunked]');
        return replaceTargetWithFile(target, request.file);
      }
    }
  })
}
startup();
let observer = new MutationObserver(function(mutations) {
  for (let mutation of mutations) {
    if (mutation.addedNodes && mutation.addedNodes.length) {
      if(logenabled)
        console.log("Nodes added to message: " + mutation.addedNodes.length);
      for (let target of mutation.addedNodes) {
        maybeResizeInline(target);
      }
    }
  }
});
observer.observe(document.body, config);
 
async function parseInlineAtStart()
{
  if(logenabled)
    console.log(`parsing inline images at compose start`);
  let existingInline=document.body.getElementsByTagName("IMG");
  for(let i=0;i<existingInline.length;i++)
  {
    if(logenabled)
      console.log(`parsing image ${i}, node ${existingInline[i].nodeName}`);
    await maybeResizeInline(existingInline[i]); 
  }
}

async function maybeResizeInline(target) {
  if (target.nodeName == "IMG") {
    try {
      if (logenabled)
        console.log(
        "<IMG> found, source is " +
          target.src.substring(0, 100) +
          (target.src.length <= 100 ? "" : "\u2026")
        );
      let parent = target.parentNode;
      while (parent && "classList" in parent) {
        if (parent.classList.contains("moz-signature")) {
          if (logenabled)
            console.log("Not resizing - image is part of signature");
          return;
        }
        if (parent.getAttribute("type") == "cite"  && resizeWhenForwardReply==false) {
          if (logenabled)
            console.log("Not resizing - image is part of message being replied to");
          return;
        }
        if (parent.classList.contains("moz-forward-container") && resizeWhenForwardReply==false) {
          if (logenabled)
            console.log("Not resizing - image is part of forwarded message");
          return;
        }
        parent = parent.parentNode;
      }

      if (!target.complete) {
        target.addEventListener(
          "load",
          () => {
            if (logenabled)
              console.log("Image now loaded, calling maybeResizeInline");
            maybeResizeInline(target);
          },
          { once: true }
        );
        if (logenabled)
          console.log("Image not yet loaded");
        return;
      }

      if (target.hasAttribute("shrunked:resized")) {
        if (logenabled)
          console.log("Not resizing - image already has shrunked attribute");
        return;
      }
      if (!imageIsAccepted(target)) {
        if (logenabled)
          console.log("Not resizing - image is not JPEG / PNG / BMP");
        return;
      }
      if (target.width < 500 && target.height < 500) {
        if (logenabled)
          console.log("Not resizing - image is too small");
        return;
      }

      let src = target.getAttribute("src");
      if (/^data:/.test(src)) {
        let srcSize = ((src.length - src.indexOf(",") - 1) * 3) / 4;
        if (src.endsWith("=")) {
          srcSize--;
          if (src.endsWith("==")) {
            srcSize--;
          }
        }
        let { fileSizeMinimum } = await browser.storage.local.get({
          fileSizeMinimum: 100,
        });
        if (srcSize < fileSizeMinimum * 1024) {
          if (logenabled)
            console.log("Not resizing - image file size is too small");
          return;
        }
      }

      let srcFile = await getFileFromTarget(target);
      let destFile = await browser.runtime.sendMessage({
        type: "resizeFile",
        file: srcFile,
      }).catch((err) => {
        console.error(err);
        return;
      });

      if (destFile === null || destFile === undefined) {
        return;
      }
      
      await replaceTargetWithFile(target, destFile);
    } catch (ex) {
      if (logenabled)
        console.error(ex);
    }
  } else if (target.nodeType == Node.ELEMENT_NODE) {
    if (logenabled)
      console.log("<" + target.nodeName + "> found, checking children");
    for (let child of target.children) {
      maybeResizeInline(child);
    }
  }
}
function changeExtensionIfNeeded(filename){
  let src=filename.toLowerCase();
  //if it is a bmp we will save it as jpeg
  if (src.startsWith("data:image/bmp")  || src.endsWith(".bmp"))
  {
    return src.replace("bmp","jpg");
  }
  else
    return src;
  
}
function imageIsAccepted(image) {
  let src = image.src.toLowerCase();
  let isJPEG = src.startsWith("data:image/jpeg") || src.endsWith(".jpg") || src.endsWith(".jpeg");
  let isPNG = src.startsWith("data:image/png") || src.endsWith(".png");
  let isBMP = src.startsWith("data:image/bmp") || src.endsWith(".bmp");
  return isJPEG | isPNG | isBMP;
}
async function getFileFromTarget(target) {
  let srcName = "";
  let nameParts = target.src.match(/;filename=([^,;]*)[,;]/);
  if (nameParts) {
    srcName = decodeURIComponent(nameParts[1]);
  }

  let response = await fetch(target.src);
  let srcBlob = await response.blob();
  return new File([srcBlob], srcName);
}
async function replaceTargetWithFile(target, destFile) {
  let destURL = await new Promise(resolve => {
    let reader = new FileReader();
    reader.onloadend = function () {
      let dataURL = reader.result;
      let headerIndexEnd = dataURL.indexOf(";");
      dataURL =
        reader.result.substring(0, headerIndexEnd) + ";filename=" + encodeURIComponent(changeExtensionIfNeeded(destFile.name)) + dataURL.substring(headerIndexEnd);
      resolve(dataURL);
    };
    reader.readAsDataURL(destFile);
  });

  target.setAttribute("src", destURL);
  target.removeAttribute("width");
  target.removeAttribute("height");
  target.setAttribute("shrunked:resized", "true");
}
