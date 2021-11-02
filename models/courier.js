const mongoose = require("mongoose");

const Courier = mongoose.model(
  "Courier",
  new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    status: Boolean,
    notification: {
      platform: { type: String, maxlength: 1024 },
      deviceToken: { type: String, maxlength: 1024 },
    },
  })
);

exports.Courier = Courier;
