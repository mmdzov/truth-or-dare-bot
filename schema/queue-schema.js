const { Schema } = require("mongoose");
const mongoose = require("../config/db");

const schema = new Schema({
  multiplayer: { type: Number },
  user_id: { type: Number },
  date: { type: String },
  sex: { type: String },
  target_finded: { type: Number, default: 0 },
});

const queue = mongoose.model("queues", schema);

module.exports = queue;
