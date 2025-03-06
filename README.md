# Shrunked Image Resizer

[This is a fork of add-on by Geoff Lankow](https://github.com/darktrojan/shrunked)  
Since the original repo is no longer mantained and became read-only on 28th of December, I've decided to continue my small improvements to this fantastic extension here.  

## About this extension

Each time a compatible (JPG/PNG/BMP) image is attached to/inserted into new e-mail the user has the ability to resize the image. The resized image replaces previously inserted / attached one.  

## Installation

Head over to [release page](https://github.com/memeller/shrunked/releases/latest) and download the xpi. \
If you are using Firefox, you will need to right click on the link and select "Save link as...", otherwise Firefox will try to install the xpi file in Firefox.\
Open Thunderbird, open Add-ons (Tools -> Add-ons and Themes), select "Install Add-on From File..."\
![install from file](/images/install_from_file.png)\
and select the downloaded xpi.

## How to use

After installing the add-on, some options are set by default. Please adjust the options if, for example, you want images to be resized in reply/forward mode.\
![png options](/images/options.png)\
Each time you attach/insert an image into an email, a small notfication will appear asking if you would like to resize the image(s).\
![png options](/images/notification.png)\
If you select 'Yes', a small window will appear allowing you to set the target dimensions, see the size of the image before and after, etc.\
![png options](/images/popup.png)\
After confirming the resize, the attachments / inline images will be replaced with their resized versions.\

## New in this fork (vs darkrojan's version):

- Added support for resizing images when forwarding / replying to messages. This can be enabled in the options, disabled by default.
- Added Autoresize. This can be enabled for all images / inline only / attachments only. When enabled, each time an image is inserted / attached, the requirements for the resize function are checked (file size / dimensions, the ones set in options panel). If the image should be resized, it will be resized and replaced automatically, without any user interaction.
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

## Changelog
[CHANGELOG.md](CHANGELOG.md)

## Known issues
