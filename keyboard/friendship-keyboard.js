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
    .text("گفتگو")
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

const newGameAdminKeyboard = (promoteData = {}, mode = "") => {
  let keyboard = new Keyboard().text("بازیکنان آماده👥").text("گفتگو");
  let datas = [
    [
      { name: "start_game", title: "شروع بازی🎮" },
      { name: "notify_friends", title: "اطلاع به دوستان📣" },
    ],
    [
      {
        name: "change_game_mode",
        title:
          mode === ""
            ? "-"
            : mode === "public"
            ? "شخصی کردن بازی🔑"
            : "عمومی کردن بازی🌍",
      },
    ],
    [{ name: "change_link", title: "ایجاد/تغییر لینک اختصاصی🔏" }],
    [{ name: "change_link", title: "ایجاد/تغییر لینک سریع🔏" }],
    [
      { name: "add_new_admin", title: "افزودن ادمین👑" },
      { name: "get_link", title: "دریافت لینک بازی🗳" },
    ],
  ];
  let newData = datas
    .map((item) => {
      return item.filter((i) => promoteData?.[i.name]).map((_) => _.title);
    })
    .filter((item) => item.length !== 0);

  for (let i = 0; i < newData.length; i++) {
    keyboard.row(...newData[i]);
  }
  keyboard.row().text("لغو و بازگشت");
  return keyboard;
};

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

const setAdminAccessLevel = (user_id, promote) => {
  let keyboard = new InlineKeyboard();
  let keys = [
    { text: "اطلاع به دوستان", callback_data: `can_notify_friends ${user_id}` },
    { text: "شروع بازی", callback_data: `can_start_game ${user_id}` },
    {
      text: "تغییر حالت بازی",
      callback_data: `can_change_game_mode ${user_id}`,
    },
    { text: "تغییر لینک بازی", callback_data: `can_change_link ${user_id}` },
    { text: "دریافت لینک", callback_data: `can_get_link ${user_id}` },
    { text: "ارتقاء بازیکن", callback_data: `can_add_new_admin ${user_id}` },
    { text: "حذف بازیکن", callback_data: `can_remove_player ${user_id}` },
    {
      text: "تغییر محدودیت بازی",
      callback_data: `can_read_write_limits ${user_id}`,
    },
    { text: "محدودیت بازیکن", callback_data: `can_limit_player ${user_id}` },
  ];
  for (let i = 0; i < keys.length; i++) {
    let trimCan = keys[i].callback_data
      .match(/[^0-9]/g)
      .filter((item) => item !== "")
      .join("")
      .split("_")
      .map((item) => (item !== "can" ? item : ""))
      .filter((item) => item !== "")
      .join("_")
      .trim();
    keyboard.row(
      {
        text: promote[trimCan] === true ? "✅" : "❌",
        callback_data: keys[i].callback_data,
      },
      { ...keys[i] }
    );
  }
  keyboard.row().text("بازگشت", "cancel_promote_player");
  return keyboard;
};

module.exports = {
  setAdminAccessLevel,
  newGameAdminKeyboard,
  mainFriendshipKeyboard,
  newGameFriendshipKeyboard,
  newPlayerInlineSetting,
};
