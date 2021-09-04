const { Mongoose } = require("mongoose");

let db = new Mongoose();
db.connect("mongodb://localhost:27017/truthordarebot");

module.exports = db;
