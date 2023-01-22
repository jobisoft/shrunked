# Shrunked Image Resizer

[This is a fork of add-on by Geoff Lankow](https://github.com/darktrojan/shrunked)  
Since the original repo is no longer mantained and became read-only on 28th of December, I've decided to continue my small improvements to this fantastic extension here.  

## About this extension

After installing each time a compatible (JPG/PNG) image is attached to/inserted into new e-mail the user has the ability to resize the image. The resized image replaces previously inserted / attached one.  

## New in this fork (vs darkrojan's version):

- Added PL lang support,
- PNG support,
- "Automatically rotate images" can now be checked - there was an issue with parameter name which caused the option to be permanently disabled,
- Resampling finally works  
    A bug caused the resampling process being permanently disabled, even though it was turned on in options.  
    Png from [w3c.org](https://www.w3.org/TR/dpub-latinreq/images/ImageCaptionRunaround.png) (2056x1432px) resized to 500px width:  
    ![jpg preview](/images/preview.jpg)

## Known issues

- current resampling algorithm does not support alpha channel when resizing transparent PNG