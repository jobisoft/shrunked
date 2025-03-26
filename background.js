import * as utils from "./modules/utils.mjs"

var tabMap = new Map();
let logenabled=true;
let lastContextClickedFile;
// I could slap the WECG for this stupid specification, but yes, menus.onHidden
// does not report which menu items were actually hidden. We have to keep track
// of the last shown one on our own.
let lastShownMenuIds;

async function shouldResize(attachment, checkSize = true) {
  if (!attachment.name.toLowerCase().match(/((\.jpe?g)|(\.png)|(\.bmp))$/)) {
    return false;
  }
  if (!checkSize) {
    return true;
  }
    let file = await browser.compose.getAttachmentFile(attachment.id);
    return file.size >= fileSizeMinimum * 1024;
}
//get options and defaults from config
let options={}
let defaults={}
let fileSizeMinimum=100;
//check options on start
loadOptions().then((response)=>
{
  options=response.options;
  defaults=response.defaults;
  fileSizeMinimum=response.fileSizeMinimum;
  logenabled=response.options.logenabled;
  if(logenabled)
    console.info("Shrunked Extension: Debug is enabled");
});
// CHECK: Should the migration code not run *before* the options are loaded? The
//        execution flow should probably be enforced by awaiting each statement
//        and not spinning of the then() action at an arbitrary time later (once
//        the background runs into the first await or is done).
browser.shrunked.migrateSettings().then(prefsToStore => {
  if (prefsToStore) {
    browser.storage.local.set(prefsToStore);
  }
});

browser.composeScripts.register({
  js: [
    {
      file: "compose_script.js",
    },
  ],
});
browser.runtime.onMessage.addListener(async (message, sender, callback) => {
  // Image added to body of message. Return a promise to the sender.
  if (message.type == "resizeFile") {  
    //resizeFile is sent by content script when inline image is inserted. We need to tell the function that this is inline and that the action should trigger auto resize
    return beginResize(sender.tab, message.file,true,true,true);
  }
  // Options window requesting a file.
  if (message.type == "fetchFile") {
    return Promise.resolve(tabMap.get(message.tabId)[message.index].file);
  }
  // Options window starting resize.
  if (message.type == "doResize") {
    doResize(message.tabId, message.maxWidth, message.maxHeight, message.quality);
  }
  if (message.type == "getOptions") {
    if(options.resizeInReplyForward)
      await processAllAttachments(sender.tab,null,true);
    return options;
  }
  // Content script wants to update the context menu for the composer.
  if (message.type == "updateComposeContextMenuEntry") {
    await browser.menus.update(
      "composeContextMenuEntry",
      {
        title: browser.i18n.getMessage(message.composeContextMenuEntryStatus.label),
        enabled: !message.composeContextMenuEntryStatus.disabled,
      }
    );
    await browser.menus.refresh();
    lastContextClickedFile = message.file;
    return;
  }

  return undefined;
});

// Attachment added to message. Just update the attachment.
browser.compose.onAttachmentAdded.addListener(async (tab, attachment) => {
  let { resizeAttachmentsOnSend } = await browser.storage.local.get({
    resizeAttachmentsOnSend: false,
  });
  if (resizeAttachmentsOnSend) {
    return;
  }
  if (!(await shouldResize(attachment))) {
    return;
  }

  let file = await browser.compose.getAttachmentFile(attachment.id);
  //tell beginResize that this is not inline and that this event should trigger auto resize
  let destFile = await beginResize(tab, file,true,false,true);
  if (!destFile) {
    return;
  }
  
  await browser.compose.updateAttachment(tab.id, attachment.id, {
    file: destFile,
    name: utils.changeExtensionIfNeeded(destFile.name)
  });
});

// Content context menu item.
browser.menus.create({
  id: "composeContextMenuEntry",
  contexts: ["compose_body"],
  title: browser.i18n.getMessage("context.single"),
})
// Attachment context menu item.
browser.menus.create({
  id: "attachmentContextMenuEntry",
  contexts: ["compose_attachments"],
  title: browser.i18n.getMessage("context.single"),
})
browser.menus.onShown.addListener(async (info, tab) => {
  lastShownMenuIds = info.menuIds;
  if (lastShownMenuIds.includes("attachmentContextMenuEntry")) {
    let indicies = [];
    for (let i = 0; i < info.attachments.length; i++) {
      if (utils.imageIsAccepted(info.attachments[i].name)) {
        indicies.push(i);
      }
    }

    // Check if a message should be displayed when accessing context menu on
    // unsupported images. If yes then set hidden to true, if not set it to disabled.
    let attachmentContextMenuEntryStatus = {
      enabled: true,
      visible: true,
      label: "context.single",
    }
    // Get the current value. The user might have flipped the setting while the
    // compose window was open and we would not have the correct value in the
    // pre-loaded options object.
    let { "options.contextInfo": contextInfo } = await browser.storage.local.get({
      "options.contextInfo": true
    });
    if (contextInfo) {
      attachmentContextMenuEntryStatus.enabled = !!indicies.length;
      attachmentContextMenuEntryStatus.visible = true;
    } else {
      attachmentContextMenuEntryStatus.enabled = true;
      attachmentContextMenuEntryStatus.visible = !!indicies.length;
    }

    if (!indicies.length) {
      if (logenabled) {
        console.log("Not resizing - no attachments were JPEG/PNG/BMP and large enough");
      }
      attachmentContextMenuEntryStatus.label = "context.unsupportedFile";
    } else if (indicies.length == 1) {
      attachmentContextMenuEntryStatus.label = "context.single";
    } else {
      attachmentContextMenuEntryStatus.label = "context.plural";
    }

    // Only update the menu, if it is different from the default.
    if (
      attachmentContextMenuEntryStatus.label != "context.single" ||
      !attachmentContextMenuEntryStatus.enabled ||
      !attachmentContextMenuEntryStatus.visible
    ) {
        await browser.menus.update(
        "attachmentContextMenuEntry",
        {
          title: browser.i18n.getMessage(attachmentContextMenuEntryStatus.label),
          enabled: attachmentContextMenuEntryStatus.enabled,
          visible: attachmentContextMenuEntryStatus.visible,
        }
      );
      await browser.menus.refresh();
    }
  }
  // The onShown event for composeContextMenuEntry is handled in the compose
  // script, because we need to know which element was clicked on.
});
browser.menus.onHidden.addListener(() => {
  // Unhide the menu item, so it will trigger onShown again. Also set it to the
  // default.
  if (lastShownMenuIds.includes("attachmentContextMenuEntry")) {
    browser.menus.update(
      "attachmentContextMenuEntry",
      {
        title: browser.i18n.getMessage("context.single"),
        visible: true,
        enabled: true,
      }
    );
  }
})
browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId == "attachmentContextMenuEntry") {
    // CHECK: Should this be prevented, if there is already an open resize popup?
    if (!info.attachments.length) {
      return;
    }

    // Abort any pending resize promises.
    cancelResize(tab.id);

    for (let attachment of info.attachments) {
      if (await shouldResize(attachment, false)) {
        let file = await browser.compose.getAttachmentFile(attachment.id);
        beginResize(tab, file, false).then(destFile => {
          if (!destFile) {
            return;
          }
          browser.compose.updateAttachment(tab.id, attachment.id, { file: destFile, name: utils.changeExtensionIfNeeded(destFile.name) });
        }).catch(error => {
          if(logenabled)
            console.error('attachmentContextMenuEntry clicked', error);
        });
      }
    }
    showOptionsDialog(tab);
  }

  if (info.menuItemId == "composeContextMenuEntry") {
    // CHECK: Should this be prevented, if there is already an open resize popup?

    // Abort any pending resize promises, there could be one from the mutation
    // observer in the content script registering the image being inserted.
    cancelResize(tab.id);

    beginResize(tab, lastContextClickedFile, false, true).then(destFile => {
      if (!destFile) {
        return;
      }
      browser.tabs.sendMessage(tab.id, {
        type: "replaceTargetWithFile",
        file: destFile
      });
    }).catch(error => {
      if(logenabled)
        console.error('composeContextMenuEntry clicked', error);
    });
    showOptionsDialog(tab);
  }
})

// Message sending.
browser.compose.onBeforeSend.addListener(async (tab, details) => {
  await processAllAttachments(tab,details,false);
});
async function processAllAttachments(tab, details,isOnDemand=false) {
  let result = {};
  if(!isOnDemand)
  {
    let { resizeAttachmentsOnSend } = await browser.storage.local.get({
      resizeAttachmentsOnSend: false,
    });
    if (!resizeAttachmentsOnSend) {
      return result;
   }
  }

  tabMap.delete(tab.id);
  let promises = [];
  let attachments = await browser.compose.listAttachments(tab.id);
  for (let a of attachments) {
    if (await shouldResize(a)) {
      let file = await browser.compose.getAttachmentFile(a.id);
      let promise = beginResize(tab, file, isOnDemand,false,true).then(async destFile => {
        if (!destFile) {
          return;
        }
        await browser.compose.updateAttachment(tab.id, a.id, { file: destFile, name: utils.changeExtensionIfNeeded(destFile.name) });
      }).catch(error => {
        if(logenabled)
          console.error('onBeforeSend', error);
      });
      promises.push(promise);
    }
  }

  if (!promises.length) {
    return result;
  }
  if(!isOnDemand && (options.autoResize!="attached" || options.autoResize!="all"))
    await showOptionsDialog(tab);
  await Promise.all(promises).catch(() => {
    result.cancel = true;
  });
  return result;
}
// Get a promise that resolves when resizing is complete.
// For auto resize we need to know if the image isInline and if this is an event that should trigger auto resize. This method is called multiple times, not only when adding attachemnt
function beginResize(tab, file, notification = true,isInline=false,shouldResizeAuto=false) {
  return new Promise((resolve, reject) => {
    if (!tabMap.has(tab.id)) {
      tabMap.set(tab.id, []);
    }
    let sourceFiles = tabMap.get(tab.id);
    sourceFiles.push({ promise: { resolve, reject }, file });
    
    //check if autoResize is on and if current event should trigger it (shouldResizeAuto) and also if auto resize is turned on for this type of image (inline/attachment)
    if(options.autoResize!="off" && shouldResizeAuto && ((options.autoResize=="inline" && isInline) || (options.autoResize=="attached" && !isInline) || options.autoResize=="all"))
    {
      doResize(tab.id, defaults.maxWidth,defaults.maxHeight,defaults.quality,file);
    }
    //if not proceed with notification
    else if (notification) {
      browser.shrunked.showNotification(tab, sourceFiles.length);
    } else {
      browser.shrunked.showNotification(tab, 0);
    }
  }).catch(error => {
    if(logenabled)
      console.error('beginResize', error);
  });
}

// Notification response.
browser.shrunked.onNotificationAccepted.addListener(tab => showOptionsDialog(tab));
browser.shrunked.onNotificationCancelled.addListener(tab => cancelResize(tab.id));

async function showOptionsDialog(tab) {
  let sourceFiles = tabMap.get(tab.id);
  if(sourceFiles === undefined)
    return;
  let optionsWindow = await browser.windows.create({
    url: `content/options.xhtml?tabId=${tab.id}&count=${sourceFiles.length}`,
    type: "popup",
    width: 550,
    height: 425,
  });

  let listener = windowId => {
    if (windowId == optionsWindow.id) {
      browser.windows.onRemoved.removeListener(listener);
      cancelResize(tab.id);
    }
  };
  browser.windows.onRemoved.addListener(listener);
}

// Actual resize operation.
// Since doResize usually tries to process all files, we need a special attribute (file) to tell it to process only one file when using auto resize.
// Without this each time a file is auto resized ALL of the attached files / inline images would be resized.
async function doResize(tabId, maxWidth, maxHeight, quality,file="") {
  // Remove from tabMap immediately, then cancelResize will have nothing to do.
  let sourceFiles = tabMap.get(tabId);
  tabMap.delete(tabId);

  // User opted not to resize.
  if (maxWidth < 0 || maxHeight < 0) {
    for (let source of sourceFiles) {
      source.promise.resolve(null);
    }
    return;
  }
  
  for (let source of sourceFiles) {
    if(file!="" && source.file!=file)
    continue;
    let destFile = await browser.shrunked.resizeFile(
      source.file,
      maxWidth,
      maxHeight,
      quality,
      options
    );
    source.promise.resolve(destFile);
  }
}
async function loadOptions(selectedOption=null)
{
  let options;
  if(selectedOption!==null)
  {
    options = await browser.storage.local.get({
      "options.logenabled": false,
      "options.contextInfo": true
    });
    options=options[selectedOption];
  }
  else
  {
    options = await browser.storage.local.get({
      "options.exif": true,
      "options.orientation": true,
      "options.gps": true,
      "options.resample": true,
      "options.newalgorithm": true,
      "options.logenabled":false,
      "options.contextInfo":true,
      "options.autoResize":"off",
      "options.resizeInReplyForward":false,
      "default.maxWidth": 500,
      "default.maxHeight": 500,
      "default.quality": 75,
      "default.saveDefault": true,
      "fileSizeMinimum": 100
    });
    fileSizeMinimum=options['fileSizeMinimum'];
    defaults = {
      maxWidth: options['default.maxWidth'],
      maxHeight: options['default.maxHeight'],
      quality: options['default.quality'],
      saveDefault: options['default.saveDefault'],
    }
    options = {
      exif: options['options.exif'],
      orientation: options['options.orientation'],
      gps: options['options.gps'],
      resample: options['options.resample'],
      newalgorithm: options['options.newalgorithm'],
      logenabled: options["options.logenabled"],
      contextInfo: options["options.contextInfo"],
      autoResize:options["options.autoResize"],
      resizeInReplyForward:options["options.resizeInReplyForward"]
    };
    
  }
  
  return {"options":options,"defaults":defaults,"fileSizeMinimum":fileSizeMinimum};
}
function cancelResize(tabId) {
  if (!tabMap.has(tabId)) {
    return;
  }

  for (let source of tabMap.get(tabId)) {
    source.promise.reject("Resizing cancelled.");
  }
  tabMap.delete(tabId);
}

// Clean up.
browser.tabs.onRemoved.addListener(tabId => {
  tabMap.delete(tabId);
});
//reload settings each time a new compose window is opened
browser.tabs.onCreated.addListener(tab => {
  if(tab.type=="messageCompose")
  {
    loadOptions().then((response)=>
    {
      options=response.options;
      defaults=response.defaults;
      logenabled=response.options.logenabled;
      if(logenabled)
        console.info("Shrunked Extension: Debug is enabled");
    });
  }
});
