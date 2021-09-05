const { Keyboard } = require("grammy");

const selectGender = new Keyboard()
  .text("بازگشت")
  .row()
  .text("خانم")
  .text("آقا");

module.exports = selectGender;
