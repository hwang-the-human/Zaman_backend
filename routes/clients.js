const {
  Client,
  validateSignUp,
  validateSignIn,
  validateCard,
  validateAddress,
} = require("../models/client");
const { Order } = require("../models/order");
const config = require("config");
const auth = require("../middleware/auth");
const express = require("express");
const router = express.Router();
const Joi = require("joi");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const smsc = require("../smsc/smsc_api");
const Cryptr = require("cryptr");
const { v4 } = require("uuid");

router.get("/me", auth, async (req, res) => {
  let client = await Client.findById(req.user_id).select("-password");
  let orders = await Order.find({ "client._id": req.user_id });

  res.send({ client: client, orders: orders });
});

router.patch("/add_card", auth, async (req, res) => {
  const { error } = validateCard(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const cryptr = new Cryptr(config.get("jwtPrivateKey"));
  const encryptedName = cryptr.encrypt(req.body.name);
  const encryptedDate = cryptr.encrypt(req.body.date);
  const encryptedCvv = cryptr.encrypt(req.body.cvv);
  const encryptedNumber =
    cryptr.encrypt(req.body.number) + req.body.number.substr(-4);

  const newCard = {
    _id: v4(),
    type: req.body.type,
    name: encryptedName,
    date: encryptedDate,
    cvv: encryptedCvv,
    number: encryptedNumber,
  };

  await Client.findByIdAndUpdate(req.user_id, {
    $push: {
      cards: newCard,
    },
  });

  res.status(200).send(newCard);
});

router.patch("/remove_cards", auth, async (req, res) => {
  await Client.updateOne(
    { _id: req.user_id },
    {
      $pull: {
        cards: { _id: { $in: req.body.cards_id } },
      },
    }
  );

  res.status(200).send("Cards is deleted");
});

router.patch("/add_address", auth, async (req, res) => {
  const { error } = validateAddress(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const newAddress = {
    _id: v4(),
    street: req.body.street,
    aptNumber: req.body.aptNumber,
  };

  await Client.findByIdAndUpdate(req.user_id, {
    $push: {
      addresses: newAddress,
    },
  });

  res.status(200).send(newAddress);
});

router.patch("/remove_addresses", auth, async (req, res) => {
  await Client.findByIdAndUpdate(req.user_id, {
    $pull: {
      addresses: { _id: { $in: req.body.addresses_id } },
    },
  });

  res.status(200).send("Addresses is deleted");
});

router.patch("/remove_messages", auth, async (req, res) => {
  await Client.findByIdAndUpdate(req.user_id, {
    $unset: {
      "notification.messages": "",
    },
  });

  res.status(200).send("Success!");
});

router.post("/sign_in", async (req, res) => {
  const { error } = validateSignIn(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let client = await Client.findOne({ phone: req.body.phone });
  if (!client)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const validPassword = await bcrypt.compare(
    req.body.password,
    client.password
  );
  if (!validPassword)
    return res.status(400).send("Неверный номер телефона или пароль.");

  const authToken = jwt.sign({ _id: client._id }, config.get("jwtPrivateKey"));

  let orders = await Order.find({ "client._id": client._id });

  res
    .header("x-auth-token", authToken)
    .send({ client: client, orders: orders });
});

const smsLimit1 = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message:
    "Вы отправили более 5 смс, пожалуйста повторите попытку через 1 час.",
});

const smsLimit2 = rateLimit({
  windowMs: 60000, // 60 seconds
  max: 1,
  message: "Повторите попытку через 60 секунд.",
});

router.post("/send_sms", smsLimit1, smsLimit2, async (req, res) => {
  sendSms(req, res, false);
});

router.post("/verify_sms", async (req, res) => {
  verifySms(req, res, false);
});

router.post("/sign_up", async (req, res) => {
  const smsIdToken = req.header("x-sms-id-token");

  if (!smsIdToken) return res.status(401).send("Смс токен не предоставлен.");

  const { error } = validateSignUp(
    _.pick(req.body, ["name", "surname", "phone", "password"])
  );
  if (error) return res.status(400).send(error.details[0].message);

  const decodedSmsId = jwt.verify(smsIdToken, config.get("jwtPrivateKey"));

  smsc.get_status(
    {
      phones: req.body.phone,
      id: decodedSmsId,
      all: 1,
    },
    (status, raw, err, code) => {
      if (err) return console.log(err, "code: " + code);

      const smsCode = status.message ? status.message.substr(-6) : "";

      if (smsCode !== req.body.smsCode)
        return res.status(400).send("Неверный смс-код.");
    }
  );

  let client = await Client.findOne({ phone: req.body.phone });
  if (client) return res.status(400).send("Пользователь уже зарегистрирован.");

  client = new Client(
    _.pick(req.body, ["name", "surname", "phone", "password"])
  );

  const salt = await bcrypt.genSalt(10);
  client.password = await bcrypt.hash(client.password, salt);

  await client.save();

  const authToken = jwt.sign({ _id: client._id }, config.get("jwtPrivateKey"));

  res
    .header("x-auth-token", authToken)
    .send(_.pick(client, ["_id", "name", "surname", "phone"]));
});

router.post(
  "/send_sms_for_recovery_password",
  smsLimit1,
  smsLimit2,
  async (req, res) => {
    sendSms(req, res, true);
  }
);

router.post("/verify_sms_for_recovery_password", async (req, res) => {
  verifySms(req, res, true);
});

router.patch("/recover_password", async (req, res) => {
  const smsIdToken = req.header("x-sms-id-token");

  if (!smsIdToken) return res.status(401).send("Смс токен не предоставлен.");

  const decodedSmsId = jwt.verify(smsIdToken, config.get("jwtPrivateKey"));

  smsc.get_status(
    {
      phones: req.body.phone,
      id: decodedSmsId,
      all: 1,
    },
    (status, raw, err, code) => {
      if (err) return console.log(err, "code: " + code);

      const smsCode = status.message ? status.message.substr(-6) : "";

      if (smsCode !== req.body.smsCode)
        return res.status(400).send("Неверный смс-код.");
    }
  );

  const salt = await bcrypt.genSalt(10);
  const newPassword = await bcrypt.hash(req.body.newPassword, salt);

  await Client.updateOne(
    { phone: req.body.phone },
    { $set: { password: newPassword } }
  );

  res.status(200).send("Success!");
});

router.patch("/save_device_token", auth, async (req, res) => {
  await Client.findByIdAndUpdate(req.user_id, {
    $set: {
      notification: {
        platform: req.body.platform,
        deviceToken: req.body.deviceToken,
      },
    },
  });

  res.status(200).send("Success!");
});

async function sendSms(req, res, recoveryPassword) {
  if (req.body.phone.length !== 12)
    return res.status(400).send("Неправильный номер телефона.");

  let client = await Client.findOne({ phone: req.body.phone });
  if (recoveryPassword) {
    if (!client) return res.status(400).send("Номер не зарегистрирован.");
  } else {
    if (client)
      return res.status(400).send("Пользователь уже зарегистрирован.");
  }

  let smsCode = Math.floor(100000 + Math.random() * 900000).toString();
  var smsId = Math.floor(1000 + Math.random() * 9000);

  smsc.send_sms(
    {
      id: smsId,
      phones: req.body.phone,
      mes: "Ваш код: " + smsCode,
    },
    (data, raw, err, code) => {
      if (err) return console.log(err, "code: " + code);
    }
  );
  const smsIdToken = jwt.sign(smsId, config.get("jwtPrivateKey"));
  res
    .header("x-sms-id-token", smsIdToken)
    .send({ expire: req.rateLimit.resetTime });
}

async function verifySms(req, res, recoveryPassword) {
  const smsIdToken = req.header("x-sms-id-token");

  if (!smsIdToken) return res.status(401).send("Смс токен не предоставлен.");

  if (req.body.phone.length !== 12)
    return res.status(400).send("Неправильный номер телефона.");

  let client = await Client.findOne({ phone: req.body.phone });
  if (recoveryPassword) {
    if (!client) return res.status(400).send("Номер не зарегистрирован.");
  } else {
    if (client)
      return res.status(400).send("Пользователь уже зарегистрирован.");
  }

  const decodedSmsId = jwt.verify(smsIdToken, config.get("jwtPrivateKey"));

  smsc.get_status(
    {
      phones: req.body.phone,
      id: decodedSmsId,
      all: 1,
    },
    (status, raw, err, code) => {
      if (err) return console.log(err, "code: " + code);

      const smsCode = status.message ? status.message.substr(-6) : "";

      if (smsCode !== req.body.smsCode)
        return res.status(400).send("Неверный смс-код.");

      return res
        .header("x-sms-id-token", smsIdToken)
        .send("Смс-код подтвержден!");
    }
  );
}

module.exports = router;
