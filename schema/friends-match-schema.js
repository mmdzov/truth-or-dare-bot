const { Schema } = require("mongoose");
const mongoose = require("../config/db");

const schema = new Schema({
  players: { type: Array },
  owner: { type: String },
  unique_id: { type: String },
  secret_link: { type: String },
  bans: { type: Array },
  limits: { type: Array },
  turn: { type: Object },
  admins: { type: Array },
  mode: { type: String, default: "private" },
  created: { type: Number, default: Date.now() },
});

let friendsMatch = mongoose.model("friends-match", schema);

module.exports = friendsMatch;
