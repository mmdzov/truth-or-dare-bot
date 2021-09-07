const { Keyboard } = require("grammy");

const matchKeyboard = new Keyboard()
  .text("گفتگو با بازیکن")
  .text("گزارش بازیکن")
  .row()
  .text("خروج از بازی");

const matchPlayingKeyboard = new Keyboard()
  .text("بپرس شجاعت یا حققیقت")
  .row()
  .text("گفتگو با بازیکن")
  .text("گزارش بازیکن")
  .row()
  .text("خروج از بازی");

module.exports = { matchKeyboard, matchPlayingKeyboard };
