const { Schema } = require("mongoose");
const mongoose = require("../config/db");

let schema = new Schema({
  user_id: { type: Number },
  user_unique_id: { type: String || Number },
  sex: { type: String },
  matchs: { type: Number },
  visible_profile: { type: Boolean },
  reports: { type: Array },
  friends: { type: Array },
});

const user = mongoose.model("users", schema);

module.exports = user;
