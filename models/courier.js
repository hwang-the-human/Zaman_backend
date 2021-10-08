const mongoose = require('mongoose');

const Courier = mongoose.model(
  'Courier',
  new mongoose.Schema({
    name: {type: String, required: true},
    surname: {type: String, required: true},
    phone: {type: String, required: true},
    password: {type: String, required: true},
    image: String,
    date: Date,
    status: Boolean,
  }),
);

exports.Courier = Courier;
