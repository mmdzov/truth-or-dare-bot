const { Keyboard } = require("grammy");

const reportKeyboard = new Keyboard().text("ثبت گزارش").row().text("لغو گزارش");

module.exports = { reportKeyboard };
