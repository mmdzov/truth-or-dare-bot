const { Schema } = require("mongoose");
const mongoose = require("../config/db");

const schema = new Schema({
  players: { type: Array },
  secret_link: { type: String },
  bans: { type: Array },
  limits: { type: Array },
  turn: { type: Object },
});

let friendsMatch = mongoose.model("friends-match", schema);

module.exports = friendsMatch;
