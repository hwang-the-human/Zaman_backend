const mongoose = require('mongoose');
const Joi = require('joi');

const Restaurant = mongoose.model(
  'Restaurant',
  new mongoose.Schema({
    title: {type: String, required: true},
    address: {type: String, required: true},
    phone: {type: String, required: true},
    image: {type: String, required: true},
    password: {type: String, required: true},
    categories: [String],
    dishes: [Object],
    status: {type: Object},
    discount: {type: Number},
    date: Date,
    notification: {
      platform: {type: String, maxlength: 1024},
      deviceToken: {type: String, maxlength: 1024},
    },
  }),
);

function validateSignIn(login) {
  const schema = Joi.object({
    phone: Joi.string().trim().min(12).max(12).required(),
    password: Joi.string().trim().min(8).max(1024).required(),
  });
  return schema.validate(login);
}

exports.Restaurant = Restaurant;
exports.validateSignIn = validateSignIn;
