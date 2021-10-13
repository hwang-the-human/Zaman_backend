const { Order, validate } = require("../models/order");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const auth = require("../middleware/auth");
const moment = require("moment");
const config = require("config");
var apn = require("apn");
const { Restaurant } = require("../models/restaurant");

// // Send notification
// router.post("/send_notification", async (req, res) => {
//   const deviceToken = req.header("x-device-token");
//   if (!deviceToken)
//     return res.status(401).send("Токен устройства не предоставлен.");

//   let notification = new apn.Notification({
//     alert: {
//       title: "Заказ",
//       body: "У вас новый заказ",
//     },
//     topic: "com.khvan.zaman.restaurant",
//     payload: {
//       sender: "node-apn",
//     },
//     pushType: "background",
//   });

//   await new apn.Provider({
//     token: {
//       key: config.get("apn.key"),
//       keyId: config.get("apn.keyId"),
//       teamId: config.get("apn.teamId"),
//     },
//   }).send(notification, deviceToken);

//   res.send("OK");
// });

// place a new order for client
router.post("/place_order", auth, async (req, res) => {
  let restaurant = await Restaurant.findById(req.body.restaurant._id).select(
    "-password"
  );

  if (!restaurant.status.opened)
    return res.status(400).send("Ресторан закрыт.");

  const deviceToken = req.header("x-device-token");
  if (!deviceToken)
    return res.status(401).send("Токен устройства не предоставлен.");

  // const {error} = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);

  const newDate = moment(new Date()).add(20, "minutes");
  const newOrder = new Order({ ...req.body, date: newDate });

  let notification = new apn.Notification({
    alert: {
      title: "Заказ",
      body: "У вас новый заказ",
    },
    topic: "com.khvan.zaman.restaurant",
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
  }).send(notification, deviceToken);

  await newOrder.save();

  res.status(200).send(newOrder);
});

// Find order for courier
router.patch("/order_for_courier", auth, async (req, res) => {
  let result = await Order.findOneAndUpdate(
    { courier: "" },
    { $set: { courier: req.body.courier } }
  )
    .sort({ date: -1 })
    .limit(1);

  res.status(200).send(result);
});

// Get list orders for restaurant
router.get("/orders_for_restaurant", auth, async (req, res) => {
  let orders = await Order.find({ "restaurant._id": req.user._id });
  res.status(200).send(orders);
});

// Remove order for courier
router.patch("/remove_order_for_courier", auth, async (req, res) => {
  var result = await Order.findOneAndUpdate(
    { "courier._id": req.user._id },
    {
      $set: { deleted: new Date() },
    }
  );
  res.status(200).send(result);
});

module.exports = router;
