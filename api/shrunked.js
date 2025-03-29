// eslint-disable-next-line
Cu.importGlobalProperties(["fetch", "File", "FileReader"]);

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { ExtensionSupport } = ChromeUtils.importESModule(
  "resource:///modules/ExtensionSupport.sys.mjs"
);
var { ExtensionUtils: { ExtensionError } } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionUtils.sys.mjs"
);

const resProto = Cc["@mozilla.org/network/protocol;1?name=resource"].getService(
  Ci.nsISubstitutingProtocolHandler
);

let ready = false;
let logenabled = false;
let contextInfo = true;
var shrunked = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    let { extension } = context;
    let { localeData, tabManager } = extension;

    if (!ready) {
      ready = true;

      resProto.setSubstitution(
        "shrunked",
        Services.io.newURI("modules/", null, this.extension.rootURI)
      );

      ExtensionSupport.registerWindowListener("ext-shrunked-compose", {
        chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xhtml"],
        onLoadWindow(window) {
          let attachmentContext = window.document.getElementById("msgComposeAttachmentItemContext");
          if (!attachmentContext) {
            return;
          }

          let indicies = [];
          let attachmentMenuItem = attachmentContext.insertBefore(
            window.document.createXULElement("menuitem"),
            window.document.getElementById("composeAttachmentContext_renameItem")
          );
          attachmentMenuItem.id = "shrunked-attachment-context-item";

          attachmentContext.addEventListener("popupshowing", function () {
            if (logenabled)
              console.log("Context menu on attachments");
            indicies.length = 0;
            let items = window.document.getElementById("attachmentBucket").itemChildren;
            for (let i = 0; i < items.length; i++) {
              if (!items[i].selected) {
                continue;
              }
              let attachment = items[i].attachment;
              if (
                imageIsAccepted(attachment.url)
              ) {

                indicies.push(i);
              }
            }
            //check if a message should be displayed when accessing context menu on unsupported images
            //if yes then set hidden to true, if not set it to disabled.
            if(contextInfo)
            {
              attachmentMenuItem.disabled = !indicies.length;
              attachmentMenuItem.hidden = false;
            }
            else
            {
              attachmentMenuItem.disabled = false;
              attachmentMenuItem.hidden = !indicies.length;
            }

            if (!indicies.length) {
              if (logenabled)
                console.log("Not resizing - no attachments were JPEG/PNG/BMP and large enough");
              attachmentMenuItem.label = localeData.localizeMessage("context.unsupportedFile");
            } else if (indicies.length == 1) {
              attachmentMenuItem.label = localeData.localizeMessage("context.single");
            } else {
              attachmentMenuItem.label = localeData.localizeMessage("context.plural");
            } 
          });

          attachmentMenuItem.addEventListener("command", () => {
            extension.emit("shrunked-attachment-context", window, indicies);
          });
        },
      });

      context.callOnClose(this);
    }

    return {
      shrunked: {
        onNotificationAccepted: new ExtensionCommon.EventManager({
          context,
          name: "shrunked.onNotificationAccepted",
          register(fire) {
            function callback(event, tab) {
              return fire.async(tab);
            }

            extension.on("shrunked-accepted", callback);
            return function () {
              extension.off("shrunked-accepted", callback);
            };
          },
        }).api(),
        onNotificationCancelled: new ExtensionCommon.EventManager({
          context,
          name: "shrunked.onNotificationCancelled",
          register(fire) {
            function callback(event, tab) {
              return fire.async(tab);
            }

            extension.on("shrunked-cancelled", callback);
            return function () {
              extension.off("shrunked-cancelled", callback);
            };
          },
        }).api(),
        onAttachmentContextClicked: new ExtensionCommon.EventManager({
          context,
          name: "shrunked.onAttachmentContextClicked",
          register(fire) {
            function callback(event, window, indicies) {
              let tab = extension.tabManager.getWrapper(window);
              return fire.async(tab.convert(), indicies);
            }

            extension.on("shrunked-attachment-context", callback);
            return function () {
              extension.off("shrunked-attachment-context", callback);
            };
          },
        }).api(),
        //I could not find any way of direct accessing storage.local from here. The 'recommended' way from topicbox is to use message send, but since i only need one boolean this should be enough.
        setOptions(isDebugEnabled,isContextInfoEnabled) {
          let branch = Services.prefs.getBranch("extensions.shrunked.");
          branch.setBoolPref("logenabled", isDebugEnabled);
          branch.setBoolPref("contextInfo", isContextInfoEnabled);
          contextInfo=isContextInfoEnabled;
          logenabled=isDebugEnabled;
        },
        migrateSettings() {
          let prefsToStore = { version: extension.version };
          let branch = Services.prefs.getBranch("extensions.shrunked.");

          if (Services.vc.compare(branch.getCharPref("version", "5"), "5") >= 0) {
            return prefsToStore;
          }

          let defaultPrefs = {
            "default.maxWidth": 500,
            "default.maxHeight": 500,
            "default.quality": 75,
            "default.saveDefault": true,
            fileSizeMinimum: 100,
            "log.enabled": false,
            "options.exif": true,
            "options.orientation": true,
            "options.gps": true,
            "options.resample": true,
            "options.newalgorithm": true,
            "options.logenabled": false,
            "options.contextInfo": true,
            "options.autoResize": "off",
            "options.resizeInReplyForward": false,
            resizeAttachmentsOnSend: false,
          };

          for (let [key, defaultValue] of Object.entries(defaultPrefs)) {
            if (!branch.prefHasUserValue(key)) {
              continue;
            }

            let value;
            if (typeof defaultValue == "boolean") {
              value = branch.getBoolPref(key);
            } else if (typeof defaultValue == "number") {
              value = branch.getIntPref(key);
            } else {
              value = branch.getCharPref(key);
            }
            if (value != defaultValue) {
              prefsToStore[key] = value;
            }
          }

          branch.setCharPref("version", extension.version);
          return prefsToStore;
        },
        showNotification(tab, imageCount) {
          
          return new Promise(async (resolve, reject) => {
            let question = localeData.localizeMessage(
              imageCount == 1 ? "question.single" : "question.plural"
            );
            
            let nativeTab = tabManager.get(tab.id).nativeTab;
            //message display notification from https://github.com/jobisoft/notificationbar-API/blob/master/notificationbar/implementation.js
            let notifyBox =
              nativeTab.gComposeNotification || ((nativeTab.gNotification)?nativeTab.gNotification.notificationbox:null) || nativeTab.chromeBrowser.contentWindow.messageBrowser.contentWindow.gMessageNotificationBar.msgNotificationBar;
            let notification = notifyBox.getNotificationWithValue("shrunked-notification");
              if (imageCount == 0) {
                if (notification) {
                  if (logenabled)
                    console.log("Removing resize notification");
                  notifyBox.removeNotification(notification);
                }
                return;
              }
              if (notification) {
                if (logenabled)
                  console.log("Resize notification already visible");
                notification._promises.push({ resolve, reject });
                notification.label = question;
                return;
              }
              if (logenabled)
                console.log("Showing resize notification");

              let buttons = [
                {
                  accessKey: localeData.localizeMessage("yes.accesskey"),
                  callback: () => {
                    if (logenabled)
                      console.log("Resizing started");
                    extension.emit("shrunked-accepted", tab);
                  },
                  label: localeData.localizeMessage("yes.label"),
                },
                {
                  accessKey: localeData.localizeMessage("no.accesskey"),
                  callback() {
                    if (logenabled)
                      console.log("Resizing cancelled");
                    extension.emit("shrunked-cancelled", tab);
                  },
                  label: localeData.localizeMessage("no.label"),
                },
              ];

              notification = await notifyBox.appendNotification(
                "shrunked-notification",
                {
                  label: question,
                  priority: notifyBox.PRIORITY_INFO_HIGH,
                },
                buttons
              );
              notification.dismissable = false;
              notification._promises = [{ resolve, reject }];
          });
        },
        async resizeFile(file, maxWidth, maxHeight, quality, options) {
          const { ShrunkedImage } = ChromeUtils.importESModule("resource://shrunked/ShrunkedImage.sys.mjs");

          return new ShrunkedImage(file, maxWidth, maxHeight, quality, options).resize();
        },
        async estimateSize(file, maxWidth, maxHeight, quality) {
          const { ShrunkedImage } = ChromeUtils.importESModule("resource://shrunked/ShrunkedImage.sys.mjs");
          return new ShrunkedImage(file, maxWidth, maxHeight, quality).estimateSize();
        },
      },
    };
  }

  close() {
    resProto.setSubstitution("shrunked", null);

    ExtensionSupport.unregisterWindowListener("ext-shrunked-compose");

    for (let window of Services.wm.getEnumerator("msgcompose")) {
      for (let selector of [
        "#shrunked-attachment-context-item",
        `notification[value="shrunked-notification"]`,
      ]) {
        let element = window.document.querySelector(selector);
        if (element) {
          element.remove();
        }
      }
    }
  }
};
function changeExtensionIfNeeded(filename) {
  let src = filename.toLowerCase();
  //if it is a bmp we will save it as jpeg
  if (src.startsWith("data:image/bmp") || src.endsWith(".bmp")) {
    return src.replace("bmp", "jpg");
  }
  else
    return src;
}
function imageIsAccepted(url) {
  let src = url.toLowerCase();
  let isJPEG = src.startsWith("data:image/jpeg") || src.endsWith(".jpg") || src.endsWith(".jpeg");
  let isPNG = src.startsWith("data:image/png") || src.endsWith(".png");
  let isBMP = src.startsWith("data:image/bmp") || src.endsWith(".bmp");
  return isJPEG | isPNG | isBMP;
}