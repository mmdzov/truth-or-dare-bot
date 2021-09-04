const { Schema } = require("mongoose");
const mongoose = require("../config/db");

let schema = new Schema({
  user_id: { type: Number },
});

const user = mongoose.model("users", schema);

module.exports = user;
