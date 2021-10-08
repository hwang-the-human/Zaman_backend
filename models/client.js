const mongoose = require('mongoose');
const Joi = require('joi');

const Client = mongoose.model(
  'Client',
  new mongoose.Schema({
    name: {type: String, required: true, minlength: 1, maxlength: 50},
    surname: {type: String, required: true, minlength: 1, maxlength: 50},
    cards: [Object],
    addresses: [Object],
    phone: {
      type: String,
      required: true,
      minlength: 12,
      maxlength: 12,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024,
    },
    notification: {
      platform: {type: String, maxlength: 1024},
      deviceToken: {type: String, maxlength: 1024},
    },
  }),
);

function validateSignUp(client) {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    surname: Joi.string().min(1).max(50).required(),
    phone: Joi.string().min(12).max(12).required(),
    password: Joi.string().min(8).max(1024).required(),
  });
  return schema.validate(client);
}

function validateSignIn(login) {
  const schema = Joi.object({
    phone: Joi.string().trim().min(12).max(12).required(),
    password: Joi.string().trim().min(8).max(1024).required(),
  });
  return schema.validate(login);
}

function validateCard(card) {
  const schema = Joi.object({
    type: Joi.string().trim().min(2).max(50).required(),
    name: Joi.string().trim().min(2).max(50).required(),
    date: Joi.string().trim().min(5).max(5).required(),
    cvv: Joi.string().trim().min(3).max(3).required(),
    number: Joi.string().trim().min(16).max(16).required(),
  });
  return schema.validate(card);
}

function validateAddress(address) {
  const schema = Joi.object({
    street: Joi.string().trim().min(5).max(50).required(),
    aptNumber: Joi.string().trim().min(1).max(50).required(),
  });
  return schema.validate(address);
}

exports.Client = Client;
exports.validateSignUp = validateSignUp;
exports.validateSignIn = validateSignIn;
exports.validateCard = validateCard;
exports.validateAddress = validateAddress;
