const { Order, validate } = require("../models/order");
const { Restaurant } = require("../models/restaurant");
const { Courier } = require("../models/courier");
const { History } = require("../models/history");
const { Client } = require("../models/client");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const auth = require("../middleware/auth");
const config = require("config");
const apn = require("apn");
const moment = require("moment");
const { sendNotification } = require("../extensions/notification");

//Cancel order by restaurant
router.patch("/cancel_order", async (req, res) => {
  const client = await Client.findById(req.body.client_id);

  if (!client) return res.status(400).send("Клиент не найден.");

  client.notification.messages.push(req.body.message);
  await client.save();

  // await Order.findByIdAndDelete(req.body.order_id);

  sendNotification(
    "Отмена заказа",
    "com.khvan.zaman",
    client.notification.deviceToken
  );

  res.status(200).send("Success!");
});

// Place a new order for client
router.post("/place_order", auth, async (req, res) => {
  const restaurant = await Restaurant.findById(req.body.restaurant._id).select(
    "status notification"
  );
  let courier = await Courier.findOne({ status: true });

  if (!restaurant.status.opened)
    return res.status(400).send("Ресторан закрыт.");

  // const {error} = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);

  let newOrder = req.body;

  if (courier) {
    courier.status = false;
    await courier.save();

    courier = {
      _id: courier._id,
      name: courier.name,
      surname: courier.surname,
      phone: courier.phone,
      date: new Date(),
    };

    newOrder = {
      ...newOrder,
      courier: courier,
    };
    sendNotification(
      "У вас новый заказ",
      "com.khvan.zaman.courier",
      courier.notification.deviceToken
    );
  }

  await new Order(newOrder).save();

  sendNotification(
    "У вас новый заказ",
    "com.khvan.zaman.restaurant",
    restaurant.notification.deviceToken
  );

  res.status(200).send(newOrder);
});

// Find order for courier
router.patch("/find_order_for_courier", auth, async (req, res) => {
  let courier = await Courier.findById(req.user_id);
  let order = await Order.findOne({ courier: { $exists: false } })
    .sort({ date: -1 })
    .limit(1);

  if (order && !courier.status) {
    order.courier = courier;
    await order.save();
  } else {
    courier.status = req.body.status;
    await courier.save();
  }
  res.status(200).send(order);
});

// Get order for courier
router.get("/get_order_for_courier", auth, async (req, res) => {
  let order = await Order.findOne({
    "courier._id": req.user_id._id,
  });
  res.status(200).send(order);
});

router.post("/finish_order_for_courier", auth, async (req, res) => {
  const order = await Order.findOne({
    "courier._id": req.user_id._id,
  });

  if (!order) return res.status(400).send("Заказ не существует.");

  const now = moment(new Date());
  const late = moment(order.date);
  var minutes = now.diff(late, "minutes");

  if (minutes <= 10)
    return res.status(400).send("Должно пройти минимум 10 мин.");

  await order.remove();

  const newHistory = new History({
    _id: order._id,
    restaurant: order.restaurant,
    courier: order.courier,
    client: order.client,
    orders: order.orders,
    total_price: order.total_price,
    date: order.date,
  });

  await newHistory.save();

  res.sendStatus(200);
});

// Get list orders for restaurant
router.get("/get_orders_for_restaurant", auth, async (req, res) => {
  let orders = await Order.find({
    "restaurant._id": req.user_id._id,
  });
  res.status(200).send(orders);
});

router.get("/get_order_history", auth, async (req, res) => {
  const itemCount = parseInt(req.query.itemCount);

  let history = await History.find({
    [req.query.path + "._id"]: req.user_id._id,
  })
    .skip(itemCount)
    .limit(8)
    .sort({ date: -1 });

  res.status(200).send(history);
});

module.exports = router;
