const { Keyboard, InlineKeyboard } = require("grammy");

const multiplayerMatchKeyboard = new Keyboard()
  .text("👥گفتگو با بازیکنان")
  .text("🗣گفتگو با بازیکن خاص")
  .row()
  .text("⚠️گزارش بازیکن")
  .text("❗️ گزارش بازی")
  .row()
  .text("📝جزئیات بازی")
  .text("🚷ترک بازی");

const multiplayerMatchCurrentUserKeyboard = new Keyboard()
  .text("بپرس شجاعت یا حقیقت؟")
  .row()
  .text("👥گفتگو با بازیکنان")
  .text("🗣گفتگو با بازیکن خاص")
  .row()
  .text("⚠️گزارش بازیکن")
  .text("❗️ گزارش بازی")
  .row()
  .text("📝جزئیات بازی")
  .text("🚷ترک بازی");

const aboutMessageInlineKeyboard = (user_id) => {
  return new InlineKeyboard().text("گزارش بازیکن", `reportPlayer ${user_id}`);
  // .row();
};
// .text("گزارش محتوا", `reportMessageContent ${user_id}`)
// .row()

const privateChatKeyboard = (user_id) => {
  return aboutMessageInlineKeyboard(user_id)
    .text("گفتگو با بازیکن", `chatBetweenTwo ${user_id}`)
    .row()
    .text("پیامهاش رو نمایش نده", `hiddenMessages ${user_id}`)
    .row()
    .text("پیامهاش رو نمایش بده", `showMessages ${user_id}`).inline_keyboard;
};

module.exports = {
  multiplayerMatchKeyboard,
  multiplayerMatchCurrentUserKeyboard,
  aboutMessageInlineKeyboard,
  privateChatKeyboard,
};
