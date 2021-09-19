const { Keyboard, InlineKeyboard } = require("grammy");

const mainFriendshipKeyboard = new Keyboard()
  .text("بازی جدید🎮")
  .row()
  .text("ورود به بازی🚪")
  .text("افزودن دوست➕")
  .row()
  .text("بازگشت");

const newGameInlineKeyboard = new Keyboard()
  .text("بازیکنان آماده👥")
  .text("شروع بازی🎮")
  .row()
  .text("اطلاع به دوستان📣")
  .row()
  .text("تغییر لینک اختصاصی♻️")
  .text("ایجاد لینک اختصاصی🔏")
  .row()
  .text("تغییر لینک سریع♻️")
  .text("ایجاد لینک سریع🔏")
  .row()
  .text("لغو و بازگشت");

module.exports = {
  mainFriendshipKeyboard,
  newGameInlineKeyboard,
};
