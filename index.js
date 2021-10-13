const config = require("config");
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const restaurants = require("./routes/restaurants");
const clients = require("./routes/clients");
const orders = require("./routes/orders");
const couriers = require("./routes/couriers");
const images = require("./routes/images");
const Cryptr = require("cryptr");

if (!config.get("jwtPrivateKey")) {
  console.log("FATAL ERROR: jwtPrivateKey is not defined.");
  process.exit(1);
}

// const connection = mongoose.connection;

// connection.once('open', () => {
//   console.log('Connected to Streams');

//   var pipeline = [
//     {
//       $match: {
//         $or: [{operationType: 'update'}, {operationType: 'insert'}],
//       },
//     },
//   ];

//   var options = {fullDocument: 'updateLookup'};

//   const orders = connection.collection('orders').watch(pipeline, options);

//   var apn = require('apn');
//   const apnProduction = process.env.NODE_ENV === 'production' ? true : false;
//   const apnOptions = {
//     token: {
//       key: 'apns.p8',
//       keyId: '2H43UKU447',
//       teamId: 'AQW4645D3Q',
//     },
//     production: apnProduction,
//   };
//   var apnProvider = new apn.Provider(apnOptions);

//   orders.on('change', changes => {
//     console.log(changes);
//     // io.of('/api/socket').emit(changes.fullDocument.restaurant._id, changes);
//     if (changes.fullDocument.restaurant.notification.platform === 'ios') {
//       try {
//         // const deviceTokens =
//         //   'c0345104e975eb4eebacc989a7935e04fe44b7c9ee1c2844a02f05a25c59734e';
//         const cryptr = new Cryptr(config.get('jwtPrivateKey'));

//         const decryptedDeviceToken = cryptr.decrypt(
//           changes.fullDocument.restaurant.notification.deviceToken,
//         );

//         let notification = new apn.Notification({
//           alert: {
//             title: 'Hello World',
//             body: 'Hello world body',
//           },
//           topic: 'com.khvan.zaman',
//           payload: {
//             sender: 'node-apn',
//           },
//           pushType: 'background',
//         });

//         apnProvider.send(notification, decryptedDeviceToken).then(response => {
//           console.log(response.sent);
//           console.log(response.failed);
//         });

//         res.json({
//           processed: true,
//         });
//       } catch (e) {
//         next(e);
//       }
//     }
//   });
// });

app.use(express.json());
app.use("/api/orders", orders);
app.use("/api/restaurants", restaurants);
app.use("/api/clients", clients);
app.use("/api/couriers", couriers);
app.use("/api/images", images);

app.listen(port, () => console.log("Listening on port", port + "..."));

mongoose
  .connect(config.get("db"), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log("Connected to MongoDB..."))
  .catch((error) => console.log("Could not connect to MongoDB", error));
