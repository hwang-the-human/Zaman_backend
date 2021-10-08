const { Image } = require("../models/image");
const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const multer = require("multer");
const upload = multer({ dest: "uploaded images/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  const base64 = await fs.readFile(req.file.path, "base64");
  const buffer = Buffer.from(base64, "base64");

  const image = new Image({ image: buffer });

  await image.save();

  await fs.unlink(req.file.path, (err) => {
    if (err) return console.log(err);
  });

  res.send("Image saved.");
});

router.get("/image/:id", async (req, res) => {
  let image = await Image.findById(req.params.id);
  res.send(image.image);
});

module.exports = router;
