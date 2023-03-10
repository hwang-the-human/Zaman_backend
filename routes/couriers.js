const { Courier } = require("../models/courier");
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

router.get("/me", auth, async (req, res) => {
  let courier = await Courier.findById(req.user_id).select("-password");
  let order = await Order.findOne({ "courier._id": req.user_id });
  res.send({ courier: courier, order: order });
});

// Sign in to courier account
router.post("/sign_in", async (req, res) => {
  // const { error } = validateSignIn(req.body);
  // if (error) return res.status(400).send(error.details[0].message);

  let courier = await Courier.findOne({ phone: req.body.phone });
  if (!courier)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const validPassword = await bcrypt.compare(
    req.body.password,
    courier.password
  );
  if (!validPassword)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const authToken = jwt.sign({ _id: courier._id }, config.get("jwtPrivateKey"));

  let order = await Order.findOne({ "courier._id": courier._id });

  res
    .header("x-auth-token", authToken)
    .send({ courier: courier, order: order });
});

router.patch("/save_device_token", auth, async (req, res) => {
  await Courier.findByIdAndUpdate(req.user_id, {
    $set: {
      notification: {
        platform: req.body.platform,
        deviceToken: req.body.deviceToken,
      },
    },
  });
  res.sendStatus(200);
});

module.exports = router;
