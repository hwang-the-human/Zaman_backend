const { Restaurant, validateSignIn } = require("../models/restaurant");
const { Order } = require("../models/order");
const Joi = require("joi");
const express = require("express");
const router = express.Router();
const RegexParser = require("regex-parser");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const bcrypt = require("bcrypt");
const config = require("config");
const _ = require("lodash");
const mongoose = require("mongoose");

// Get private restaurant's info
router.get("/me", auth, async (req, res) => {
  let restaurant = await Restaurant.findById(req.user_id).select("-password");
  let orders = await Order.find({ "restaurant._id": req.user_id });
  res.send({ restaurant: restaurant, orders: orders });
});

// Sign in to restaurant account
router.post("/sign_in", async (req, res) => {
  const { error } = validateSignIn(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let restaurant = await Restaurant.findOne({ phone: req.body.phone });
  if (!restaurant)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const validPassword = await bcrypt.compare(
    req.body.password,
    restaurant.password
  );
  if (!validPassword)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const authToken = jwt.sign(
    { _id: restaurant._id },
    config.get("jwtPrivateKey")
  );

  let orders = await Order.find({ "restaurant._id": restaurant._id });

  res
    .header("x-auth-token", authToken)
    .send({ restaurant: restaurant, orders: orders });
});

//Change status of cafe
router.patch("/change_status", auth, async (req, res) => {
  if (typeof req.body.opened != "boolean")
    return res.status(400).send("Неверный тип.");

  await Restaurant.findByIdAndUpdate(req.user_id, {
    $set: {
      "status.opened": req.body.opened,
    },
  });
  res.status(200).send("Статус был изменен.");
});

//Change Status of dishes
router.patch("/change_orders_status", auth, async (req, res) => {
  await Restaurant.findByIdAndUpdate(req.user_id, [
    {
      $addFields: {
        dishes: {
          $map: {
            input: "$dishes",
            as: "d",
            in: {
              $cond: {
                if: {
                  $in: ["$$d._id", req.body.dishes],
                },
                then: {
                  $mergeObjects: [
                    "$$d",
                    {
                      in_stock: {
                        $not: ["$$d.in_stock"],
                      },
                    },
                  ],
                },
                else: "$$d",
              },
            },
          },
        },
      },
    },
  ]);

  res.status(200).send("Статус блюд был изменен.");
});

// Get list of restaurants for client
router.get("/get_list_of_restaurants", async (req, res) => {
  const regEx = RegexParser("/.*" + req.query.title + ".*/i");
  const itemCount = parseInt(req.query.itemCount);

  const restaurant = await Restaurant.find({
    notification: { $exists: true },
  })
    .or([
      {
        title: regEx,
      },
      {
        "dishes.title": regEx,
      },
    ])
    .skip(itemCount)
    .limit(5)
    .sort({ title: 1 })
    .select("-password");
  res.send(restaurant);
});

// Get list of restaurants for client by categories
router.get("/get_list_of_restaurants_by_categories", async (req, res) => {
  const itemCount = parseInt(req.query.itemCount);

  const pipeline =
    req.query.title === "Все"
      ? { notification: { $exists: true } }
      : {
          categories: req.query.title,
          notification: { $exists: true },
        };

  const restaurant = await Restaurant.find(pipeline)
    .skip(itemCount)
    .limit(5)
    .sort({ title: 1 })
    .select("-password");

  res.send(restaurant);
});

// Get list of restaurants for client by id (favourites)
router.get("/get_list_of_restaurants_by_id", async (req, res) => {
  const itemCount = parseInt(req.query.itemCount);

  if (!req.query.favourites) return res.send([]);

  const favourites = req.query.favourites.map((a) =>
    mongoose.Types.ObjectId(a)
  );

  const restaurant = await Restaurant.find({
    _id: { $in: favourites },
    notification: { $exists: true },
  })
    .skip(itemCount)
    .limit(5)
    .select("-password");

  res.send(restaurant);
});

router.patch("/save_device_token", auth, async (req, res) => {
  await Restaurant.findByIdAndUpdate(req.user_id, {
    $set: {
      notification: {
        platform: req.body.platform,
        deviceToken: req.body.deviceToken,
      },
    },
  });

  res.status(200).send("Success!");
});

const { v4 } = require("uuid");
router.post("/register", async (req, res) => {
  for (let index = 0; index < 25; index++) {
    var dishes = [];
    for (let index2 = 0; index2 < 25; index2++) {
      dishes.push({
        _id: v4(),
        title: "Криспи Чикен" + (index + index2),
        description: "Самые вкусные бургеры!",
        image:
          "https://infinite-eyrie-01907.herokuapp.com/api/images/image/614b68af41c852485f323355",
        price: 1000,
        in_stock: true,
        type: index2 > 10 ? "Напитки0" : "Напитки1",
        prerequisites:
          index2 % 2 === 0
            ? []
            : [
                {
                  title: "Желаете добавить что-нибудь?",
                  required: false,
                  max: 2,
                  options: [
                    { title: "Соус сырный 1", price: 300 },
                    { title: "Соус сырный 2", price: 400 },
                    { title: "Соус сырный 3", price: 500 },
                    { title: "Соус сырный 4", price: 600 },
                    { title: "Соус сырный 5", price: 700 },
                  ],
                },
                {
                  title: "Желаете добавить что-нибудь?",
                  required: true,
                  max: 1,
                  options: [
                    { title: "Соус сырный 6", price: 0 },
                    { title: "Соус сырный 7", price: 300 },
                    { title: "Соус сырный 8", price: 0 },
                  ],
                },
              ],
      });
    }
    const newRestaurant = {
      title: "Бургер Кинг" + index,
      address: "Кабулкова" + index,
      phone: "+7701555555" + index,
      discount: 20,
      categories: ["Азиатская", "Акции", "Восточная"],
      image:
        "https://infinite-eyrie-01907.herokuapp.com/api/images/image/614b68af41c852485f323355",
      status: {
        opened: false,
        time: ["Пн - Пт: 9:00-22:00", "Сб: 9:00-22:00", "Вс: Закрыто"],
      },
      password: "$2b$10$VE1un6UO8nEJxjG3ruvY/ejNX6StpVx9mnuYcoFfjVKI5xkU8avmq",
      notification: {
        platform: "ios",
        deviceToken:
          "c0345104e975eb4eebacc989a7935e04fe44b7c9ee1c2844a02f05a25c59734e",
      },
      dishes: dishes,
    };
    const restaurant = new Restaurant(newRestaurant);
    await restaurant.save();
    dishes = [];
  }
  res.send("OK");
});

module.exports = router;
