const mongoose = require('mongoose');

const Image = mongoose.model(
  'Image',
  new mongoose.Schema({
    image: {type: Buffer, required: true},
  }),
);

exports.Image = Image;
