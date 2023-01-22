# Changelog

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