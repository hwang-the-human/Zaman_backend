const mongoose = require("mongoose");
const Joi = require("joi");

const History = mongoose.model(
  "History",
  new mongoose.Schema({
    restaurant: {
      _id: { type: String, required: true },
      title: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
      image: { type: String, required: true },
    },
    client: {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      surname: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: Object, required: true },
      payment: { type: Object, required: true },
    },
    courier: {
      _id: { type: String },
      name: { type: String },
      surname: { type: String },
      phone: { type: String },
    },
    orders: { type: Array, required: true },
    total_price: { type: Number, required: true },
    date: { type: Date, expires: "7d", default: Date.now },
  })
);

function validate(order) {
  const schema = Joi.object({
    restaurant: Joi.object({
      _id: Joi.string().required(),
      title: Joi.string().required(),
      address: Joi.string().required(),
      phone: Joi.string().required(),
    }).required(),
    client: Joi.object({
      _id: Joi.string().required(),
      name: Joi.string().required(),
      surname: Joi.string().required(),
      address: Joi.string().required(),
      phone: Joi.string().required(),
    }).required(),
    courier: Joi.object({
      _id: Joi.string().required(),
      name: Joi.string().required(),
      surname: Joi.string().required(),
      phone: Joi.string().required(),
    }).required(),
    date: Joi.date(),
    orders: Joi.array()
      .items(
        Joi.object().required().keys({
          title: Joi.string().required(),
          price: Joi.number().required(),
          quantity: Joi.number().required(),
        })
      )
      .required(),
  });
  return schema.validate(order);
}

exports.History = History;
exports.validate = validate;
