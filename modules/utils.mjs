import { ShrunkedImage}  from "/modules/ShrunkedImage.mjs"

export function changeExtensionIfNeeded(filename) {
    let src = filename.toLowerCase();
    //if it is a bmp we will save it as jpeg
    if (src.startsWith("data:image/bmp") || src.endsWith(".bmp")) {
        return src.replace("bmp", "jpg");
    } else {
        return src;
    }
}

export function imageIsAccepted(image) {
    // image can either be a data: url or a filename.
    let src = image.toLowerCase();
    let isJPEG = src.startsWith("data:image/jpeg") || src.endsWith(".jpg") || src.endsWith(".jpeg");
    let isPNG = src.startsWith("data:image/png") || src.endsWith(".png");
    let isBMP = src.startsWith("data:image/bmp") || src.endsWith(".bmp");
    return isJPEG | isPNG | isBMP;
}

export async function resizeFile(file, maxWidth, maxHeight, quality, options) {
    return new ShrunkedImage(file, maxWidth, maxHeight, quality, options).resize();
}

export async function estimateSize(file, maxWidth, maxHeight, quality) {
    return new ShrunkedImage(file, maxWidth, maxHeight, quality).estimateSize();
}