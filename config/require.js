const { Bot } = require("grammy");
require("dotenv").config();

let bot = new Bot(process.env.TOKEN);

module.exports = bot;
