const { Keyboard } = require("grammy");

let mainKeyboard = new Keyboard()
  .text("بازی آنلاین")
  .row()
  .text("بازی دوستانه")
  .row()
  .text("افزودن دوست")
  .row()
  .text("تنظیمات");

module.exports = mainKeyboard;
