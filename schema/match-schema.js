const { Schema } = require("mongoose");
const mongoose = require("../config/db");

const schema = new Schema({
  players: { type: Array },
  match_id: { type: String || Number },
  turn: { type: Number, default: 1 },
  sender: { type: Number },
  receiver: { type: Number },
  question: { type: Object, default: { from: {}, to: {} } },
});

const match = mongoose.model("matchs", schema);

module.exports = match;
