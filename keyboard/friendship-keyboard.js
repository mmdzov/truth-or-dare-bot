const { Keyboard, InlineKeyboard } = require("grammy");

const mainFriendshipKeyboard = new Keyboard()
  .text("بازی جدید🎮")
  .row()
  .text("ورود به بازی🚪")
  .text("افزودن دوست➕")
  .row()
  .text("بازگشت");

const newGameFriendshipKeyboard = (mode = "private") => {
  return new Keyboard()
    .text("بازیکنان آماده👥")
    .text("شروع بازی🎮")
    .row()
    .text("اطلاع به دوستان📣")
    .row()
    .text(mode === "public" ? "شخصی کردن بازی🔑" : "عمومی کردن بازی🌍")
    .row()
    .text("ایجاد/تغییر لینک اختصاصی🔏")
    .row()
    .text("ایجاد/تغییر لینک سریع🔏")
    .row()
    .text("افزودن ادمین👑")
    .text("دریافت لینک بازی🗳")
    .row()
    .text("لغو و بازگشت");
};

const newGameAUserKeyboard = new Keyboard()
  .text("گفتگو")
  .text("بازیکنان")
  .row()
  .text("لغو و بازگشت");

const newPlayerInlineSetting = (
  user_id,
  isOwner,
  remove_player,
  limit_player,
  promote_player
) => {
  return new InlineKeyboard()
    .row(
      remove_player || isOwner
        ? {
            text: "حذف بازیکن",
            callback_data: `removePlayer_friendship ${user_id}`,
          }
        : { text: "دکمه قفل شده", callback_data: "دکمه قفل شده" }
    )
    .row(
      limit_player || isOwner
        ? {
            text: "محدود کردن بازیکن",
            callback_data: `limitationPlayer_friendship ${user_id}`,
          }
        : { text: "دکمه قفل شده", callback_data: "دکمه قفل شده" }
    )
    .row(
      promote_player || isOwner
        ? {
            text: "ارتقاء بازیکن",
            callback_data: `promotePlayer_friendship ${user_id}`,
          }
        : { text: "دکمه قفل شده", callback_data: "دکمه قفل شده" }
    );
};

module.exports = {
  mainFriendshipKeyboard,
  newGameFriendshipKeyboard,
  newGameAUserKeyboard,
  newPlayerInlineSetting,
};
