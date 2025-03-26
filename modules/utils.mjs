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
