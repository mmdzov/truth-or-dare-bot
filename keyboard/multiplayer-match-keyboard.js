const { Keyboard, InlineKeyboard } = require("grammy");

const multiplayerMatchKeyboard = new Keyboard()
  .text("گفتگو با بازیکنان")
  .text("گفتگو با بازیکن خاص")
  .row()
  .text("گزارش بازیکن")
  .text("کارت قرمز")
  .row()
  .text("جزییات بازی")
  .text("ترک بازی");

const multiplayerMatchCurrentUserKeyboard = new Keyboard()
  .text("بپرس شجاعت یا حقیقت؟")
  .row()
  .text("گفتگو با بازیکنان")
  .text("گفتگو با بازیکن خاص")
  .row()
  .text("گزارش بازیکن")
  .text("کارت قرمز")
  .row()
  .text("جزییات بازی")
  .text("ترک بازی");

const aboutMessageInlineKeyboard = (user_id) => {
  return new InlineKeyboard()
    .text("گزارش بازیکن", `reportPlayer ${user_id}`)
    .row();
};
// .text("گزارش محتوا", `reportMessageContent ${user_id}`)
// .row()

module.exports = {
  multiplayerMatchKeyboard,
  multiplayerMatchCurrentUserKeyboard,
  aboutMessageInlineKeyboard,
};
