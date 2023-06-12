const config = require("config");
const apn = require("apn");

async function sendNotification(message, topic, deviceToken) {
  let notification = new apn.Notification({
    alert: {
      title: "Заказ",
      body: message,
    },
    topic: topic,
    payload: {
      sender: "node-apn",
    },
    pushType: "background",
  });

  await new apn.Provider({
    token: {
      key: config.get("apn.key"),
      keyId: config.get("apn.keyId"),
      teamId: config.get("apn.teamId"),
    },
    production: false,
  }).send(notification, deviceToken);
}

exports.sendNotification = sendNotification;
