const {Courier} = require('../models/courier');
const Joi = require('joi');
const express = require('express');
const router = express.Router();
const RegexParser = require('regex-parser');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const bcrypt = require('bcrypt');
const config = require('config');
const _ = require('lodash');

router.post('/sign_in', async (req, res) => {
  var courier = await Courier.findOne({
    phone: req.body.phone,
  });

  if (!courier)
    return res.status(400).send('Неверный номер телефона или пароль.');

  const validPassword = await bcrypt.compare(
    req.body.password,
    courier.password,
  );

  if (!validPassword)
    return res.status(400).send('Неверный номер телефона или пароль.');

  const token = jwt.sign({_id: courier._id}, config.get('jwtPrivateKey'));

  res.send({
    authToken: token,
    courier: _.pick(courier, [
      'title',
      'address',
      'phone',
      'category',
      'image',
      'date',
      'status',
      'dishes',
      'orders',
    ]),
  });
});

router.get('/me', auth, async (req, res) => {
  let courier = await Courier.findById(req.user._id).select('-password');
  res.send(courier);
});

// router.get('/', async (req, res) => {
//   const regEx = RegexParser('/.*' + req.query.title + '.*/i');
//   const itemCount = parseInt(req.query.itemCount);

//   // console.log('text:', req.query.title);

//   const restaurant = await Restaurant.find({title: regEx})
//     .skip(itemCount)
//     .limit(5);
//   // .sort({title: 1});

//   // const restaurant = res.send(
//   //   await Restaurant.find({title: 'b'})
//   //     // .find()
//   //     //   .or([{title: regEx}, {'items.title': regEx}])
//   //     .skip(itemCount)
//   //     .limit(5),
//   //   // .sort({title: 1}),
//   // );

//   // console.log(restaurant);

//   // console.log(req.query.title);
//   res.send(restaurant);
// });

//Change status of cafe
router.patch('/change_status_status', auth, async (req, res) => {
  const result = await Courier.updateOne(
    {
      _id: req.user._id,
    },
    {
      $set: {
        status: req.body.params.status,
      },
    },
  );
  res.status(200).send(result);
});

//Change Status of dishes
router.patch('/change_orders_status', auth, async (req, res) => {
  const result = await Courier.updateOne(
    {
      _id: req.user._id,
    },
    {
      $set: {
        dishes: req.body.params.dishes,
      },
    },
  );
  res.status(200).send(result);
});

router.patch('/addOrder', async (req, res) => {
  // const {error} = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);

  const result = await Courier.updateOne(
    {
      _id: req.query.id,
    },
    {
      $push: {
        orders: {
          order_number: '3020',
          client: '1234',
          courier: '123',
          date: Date.now(),
          list_of_orders: [
            {title: 'NEW ITEM 1', quantity: 3},
            {title: 'NEW ITEM 2', quantity: 1},
            {title: 'NEW ITEM 3', quantity: 5},
          ],
        },
      },
    },
  );

  // if (error)
  //   return res.status(404).send('The restaurant with given ID does not exist!');
  // `${restaurant.matchedCount} document(s) matched the filter, updated ${restaurant.modifiedCount} document(s)`,
  res.status(200).send(result);
});

// router.put('/:d', async (req, res) => {
// const {error} = validate(req.body);
// if (error) return res.status(400).send(error.details[0].message);

//   const restaurant = await Restaurant.findByIdAndUpdate(
//     req.params.id,
//     {title: req.body},
//   );
//   if (error)
//     return res.status(404).send('The restaurant with given ID does not exist!');
//   res.send(restaurant);
// });

// router.delete('/:d', async (req, res) => {
//   const restaurant = await Restaurant.findByIdAndRemove(req.params.id);

//   if (error)
//     return res.status(404).send('The restaurant with given ID does not exist!');

//   res.send(restaurant);
// });

module.exports = router;
