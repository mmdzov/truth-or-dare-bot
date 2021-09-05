const { Keyboard } = require("grammy");

const playerCountKeyboard = new Keyboard()
  .text("2 نفره")
  .text("5 نفره")
  .text("10 نفره")
  .row()
  .text("بازگشت");

module.exports = playerCountKeyboard;
