const { Keyboard } = require("grammy");

const matchPlayingKeyboard = new Keyboard()
  .text("بپرس شجاعت یا حقیقت")
  .row()
  .text("گفتگو با بازیکن")
  .text("گزارش بازیکن")
  .row()
  .text("خروج از بازی");

module.exports = { matchPlayingKeyboard };
