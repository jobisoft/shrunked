# Changelog  
## v5.7

- Added auto resize option for new messages. When enabled, each time an attachment is added / pasted inline, the extension checks if it meets the size restrictions set in the options. If so, the image is automatically resized and saved. (#12)
- Added an option to hide the extra info displayed in the attachments context menu when the file type is not supported (#13)
- Disabled Exif check on PNG files as it sometimes led to PNG files being rejected from resize
- Added 'tabs' to permissions - needed to tidy up the file map and detect the creation of new compose windows
- Added reloading of settings each time a compose window is opened
  
## v5.61

- Fixed wrong version in manifest (#10)
- Fixed some errors being thrown to console (including #11) - added catch to promises and included checking of logging enabled
- Fixed inline image context menu being disabled all the time

## v5.6

- Added quality slider to options window (#8)

## v5.5a

- Removed strict_max_version from manifest, checked briefly with Thunderbird v115.0 and it seems to be working fine

## v5.5

- Added BMP support (inline and as attachment) - bmp files are converted to jpeg when resizing.

## v5.4

- Added config option to stop logging messages to console. This required the shrunked.js to have access to webextension's storage.local, which is not available via services or extension context. I've decided to add new api that sets debug to on or off and set the value that way. Probably not the cleanest way to do it, but it works.
- The context menu item is no longer hidden for smaller files (inline images) and unsupported file formats. It is now disabled if the image is too small or of the wrong format and the menu item shows why it cannot be resized. I think this was confusing if someone added, say, a bmp file and tried to resize it, but when opening the context menu there was no resize option available and no additional information.

## v5.3

- Added different resampling algorithm - https://github.com/taisel/JS-Image-Resizer
  In some cases it gives better results than the previous one, usually the images look very similar. However, JS-Image-Resizer supports alpha channel, so it works out-of-the-box for transparent PNGs - this feature was missing in v5.2. Previous algorithm is still available and selectable in options.

## v5.2

- Fixed a bug, where the extension settings were ignored and resampling was in fact turned off for all images. This is the main cause of images looking bad after resize.
In background.js the settings were loaded into options, and then incorrectly accessed. Changing in background.js from

        exif: options.exif,
    to  

        exif: options['options.exif'],

    i.e. accessing each option through full key e.g. "options.exif" fixed the problem. I am not sure if the way of accessing the storage has changed recently or if this was wrong from the beginning
- Added PNG to Exif header detection. Due to options reading bug the Exif module was not used previously and I did not see the "Not a JPEG" exception when adding PNG files. Apart from checking the correct magic bytes nothing more was added to Exif module, so probably copying PNG Exif data will not work.
- Fixed a bug, where the "Automatically rotate images" option could not be selected. This was cause by using options.orient instead of options.orientation in one place of config.js.
- Changed extension id, added readme and changelog

## Added in previous commits

- PNG Support
- PL lang support