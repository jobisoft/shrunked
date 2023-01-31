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
    A bug caused the resampling to be permanently disabled, even though resampling was enabled in options.  
- Added new resize algorithm, taken from https://github.com/taisel/JS-Image-Resizer.
It is used by default, to use the previous algorithm please uncheck the corresponding option in the options panel. The new algorithm works with transparent PNGs, while the previous algorithm adds a black background to previously transparent PNGs when resizing them.
    Difference in resizing png from https://www.seekpng.com/ima/u2e6w7w7i1a9y3t4/ (1149x1333px) to 200px width

    ![png preview](/images/preview_png.png)
    <a href="https://www.vecteezy.com/free-vector/sound-wave-background">Sound Wave Background Vectors by Vecteezy</a>

    Difference in resizing jpg from https://www.vecteezy.com/vector-art/1957829-tech-background-with-abstract-wave-lines (4900x1960px) to 500px width

    ![jpg preview](/images/preview_jpg.jpg)
## Known issues

