# Shrunked Image Resizer

[This is a fork of add-on by Geoff Lankow](https://github.com/darktrojan/shrunked)  
Since the original repo is no longer mantained and became read-only on 28th of December, I've decided to continue my small improvements to this fantastic extension here.  

## About this extension

Each time a compatible (JPG/PNG/BMP) image is attached to/inserted into new e-mail the user has the ability to resize the image. The resized image replaces previously inserted / attached one.  

## New in this fork (vs darkrojan's version):

- Added Autoresize (currently works only for newly added attachments / inline images). This can be enabled for all images / inline only / attachments only. When enabled, each time an image is inserted / attached, the requirements for the resize function are checked (file size / dimensions, the ones set in options panel). If the image should be resized, it will be resized and replaced automatically, without any user interaction.
- Added PL lang support,
- BMP support (converted to JPG when resized),
- PNG support,
- "Automatically rotate images" can now be checked - there was an issue with parameter name which caused the option to be permanently disabled,
- Resampling finally works  
    A bug caused the resampling to be permanently disabled, even though resampling was enabled in options.  
- Added new resize algorithm, taken from https://github.com/taisel/JS-Image-Resizer.
It is used by default, to use the previous algorithm please uncheck the corresponding option in the options panel. The new algorithm works with transparent PNGs, while the previous algorithm adds a black background to previously transparent PNGs when resizing them.  
    Difference in resizing png from https://www.seekpng.com/ima/u2e6w7w7i1a9y3t4/ (1149x1333px) to 200px width

    ![png preview](/images/preview_png.png)

    Difference in resizing jpg from https://www.vecteezy.com/vector-art/1957829-tech-background-with-abstract-wave-lines (4900x1960px) to 500px width

    ![jpg preview](/images/preview_jpg.jpg)
- If the selected file cannot be resized, the context menu item is disabled and shows additional information instead of item being hidden.
- Console logging can be disabled.

## Installation
Head over to [release page](https://github.com/memeller/shrunked/releases/latest) and download the xpi. \
If you are using Firefox you need to right click the link and select "Save link as...", otherwise Firefox will try to install the xpi file in Firefox.\
Open Thunderbird, open Add-ons (Tools -> Add-ons and Themes), select "Install Add-on From File..."\
![install from file](/images/install_from_file.png)\
and select the downloaded xpi.

## Known issues
