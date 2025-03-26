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
  }
};
