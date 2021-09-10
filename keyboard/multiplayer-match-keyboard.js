const { Keyboard } = require("grammy");

const multiplayerMatchKeyboard = new Keyboard()
  .text("گفتگو با بازیکنان")
  .text("گفتگو با بازیکن خاص")
  .row()
  .text("گزارش بازیکن")
  .text("کارت قرمز")
  .row()
  .text("جزییات بازی")
  .text("ترک بازی");

module.exports = multiplayerMatchKeyboard;
