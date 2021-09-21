const { InlineKeyboard } = require("grammy");
const bot = require("../config/require");
const {
  setAdminAccessLevel,
  newGameAdminKeyboard,
} = require("../keyboard/friendship-keyboard");
const {
  getAllPlayers,
  changePlayerAccess,
} = require("../model/friends-match-model");

class Friendship {
  async readyPlayers(ctx, editMode = false) {
    let players = await getAllPlayers(null, ctx.from.id);
    players = players.filter((item) => item !== ctx.from.id);
    if (players.length === 0) {
      ctx.reply("هنوز بازیکنی در این بازی شرکت نکرده است");
      return next();
    }
    let names = new InlineKeyboard();
    for (let i = 0; i < players.length; i++) {
      let user_chat = await bot.api.getChat(players[i]);
      names.row(
        {
          text: user_chat.first_name,
          callback_data: "empty",
        },
        { text: "👑", callback_data: `promotePlayer_friendship ${players[i]}` },
        { text: "🗑", callback_data: `removePlayer_friendship ${players[i]}` }
      );
    }
    if (editMode) {
      ctx
        .editMessageText(
          `
        بازیکنان حال حاظر در انتظار بازی`,
          {
            reply_markup: {
              inline_keyboard: names.inline_keyboard,
            },
          }
        )
        .catch((e) => {});
    } else {
      ctx
        .reply(
          `
      بازیکنان حال حاظر در انتظار بازی`,
          {
            reply_markup: {
              inline_keyboard: names.inline_keyboard,
            },
          }
        )
        .catch((e) => {});
    }
  }

  exec() {
    //! handle promote player
    bot.on("callback_query:data", async (ctx, next) => {
      //   console.log(ctx);
      const promote_data = ctx.callbackQuery.data;
      if (!promote_data.includes("promotePlayer_friendship")) return next();
      const user_id = +promote_data.match(/[0-9]/g).join("");
      ctx.session.friend_game.promote.user_id = user_id;
      let user = await bot.api.getChat(user_id);
      bot.api.editMessageText(
        ctx.from.id,
        ctx.callbackQuery.message.message_id,
        `سطح دسترسی کاربر ${user.first_name} را مشخص کنید`,
        {
          reply_markup: {
            inline_keyboard: setAdminAccessLevel(
              user_id,
              ctx.session.friend_game.promote
            ).inline_keyboard,
          },
        }
      );
      return next();
    });

    //! cancel promote
    bot.on("callback_query:data", (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("cancel_promote_player"))
        return next();
      let friendship = new Friendship();
      friendship.readyPlayers(ctx, true);
      return next();
    });

    //! player access level
    bot.on("callback_query:data", async (ctx, next) => {
      if (ctx.callbackQuery.data.split("_")[0] !== "can") return next();
      const user_id = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
      let result = await changePlayerAccess(
        user_id,
        ctx.callbackQuery.data
          .match(/[^0-9]/g)
          .join("")
          .split("_")
          .map((item) => (item !== "can" ? item : ""))
          .filter((item) => item !== "")
          .join("_")
      );
      bot.api.editMessageReplyMarkup(
        ctx.from.id,
        ctx.callbackQuery.message.message_id,
        {
          reply_markup: {
            inline_keyboard: setAdminAccessLevel(user_id, result.admin)
              .inline_keyboard,
          },
        }
      );
      let datas = [
        { name: "notify_friends", title: "اطلاع به دوستان" },
        { name: "start_game", title: "شروع بازی" },
        { name: "change_game_mode", title: "تغییر حالت نمایش بازی" },
        { name: "change_link", title: "تغییر لینک بازی" },
        { name: "get_link", title: "دریافت لینک بازی" },
        { name: "add_new_admin", title: "ارتقاء بازیکنان" },
        { name: "remove_player", title: "حذف بازیکنان" },
        { name: "read_write_limits", title: "تغییر محدودیت های بازی" },
        { name: "limit_player", title: "تغییر محدودیت های بازیکن" },
      ];
      let index = datas.findIndex(
        (item) => item.name === Object.keys(result.changed)[0].trim()
      );
      // console.log(index,Object.keys(result.changed)[0])
      bot.api.sendMessage(
        user_id,
        `
${datas[index].title} برای شما ${
          result.changed[Object.keys(result.changed)[0].trim()]
            ? "فعال شد"
            : "غیرفعال شد"
        }`,
        {
          reply_markup: {
            keyboard: newGameAdminKeyboard(result.admin, result.match.mode)
              .keyboard,
            resize_keyboard: true,
          },
        }
      );
      return next();
    });
  }
}

module.exports = Friendship;
