const { InlineKeyboard } = require("grammy");
const bot = require("../config/require");
const {
  setAdminAccessLevel,
  newGameAdminKeyboard,
  newGameFriendshipKeyboard,
} = require("../keyboard/friendship-keyboard");
const friendsMatchModel = require("../model/friends-match-model");
const {
  getAllPlayers,
  changePlayerAccess,
  hasAccessFeature,
  changeGameMode,
  findFriendMatch,
  hasOwnerPlayer,
} = require("../model/friends-match-model");
const { getUserFriends } = require("../model/user-model");

class Friendship {
  async readyPlayers(ctx, editMode = false) {
    let players = await getAllPlayers(null, ctx.from.id);
    players = players.filter((item) => item !== ctx.from.id);
    if (players.length === 0) {
      ctx.reply("هنوز بازیکنی در این بازی شرکت نکرده است");
      return next();
    }

    let names = new InlineKeyboard();

    let limits = [
      { name: "add_new_admin" },
      { name: "remove_player" },
      { name: "limit_player" },
    ];
    for (let i = 0; i < limits.length; i++) {
      let result = await hasAccessFeature(ctx.from.id, limits[i].name);
      if (!result) limits[i].value = false;
      else limits[i].value = result.match;
    }

    for (let i = 0; i < players.length; i++) {
      let user_chat = await bot.api.getChat(players[i]);
      let result = await hasOwnerPlayer(user_chat.id);
      let resultMe = await hasOwnerPlayer(ctx.from.id);

      names.row({
        text: user_chat.first_name,
        callback_data: "empty",
      });

      if (resultMe || (!result && limits[0].value !== false)) {
        names.text("👑", `promotePlayer_friendship ${players[i]}`);
      }

      if (resultMe || (!result && limits[1].value !== false)) {
        names.text("🗑", `removePlayer_friendship ${players[i]}`);
      }
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
      const promote_data = ctx.callbackQuery.data;
      if (!promote_data.includes("promotePlayer_friendship")) return next();
      const user_id = +promote_data.match(/[0-9]/g).join("");
      let result = await findFriendMatch(ctx.from.id);
      if (!result) return;
      ctx.session.friend_game.promote.user_id = user_id;
      let user = await bot.api.getChat(user_id);
      let player = result.players.filter((item) => item.id === user_id)[0];
      bot.api.editMessageText(
        ctx.from.id,
        ctx.callbackQuery.message.message_id,
        `سطح دسترسی کاربر ${user.first_name} را مشخص کنید`,
        {
          reply_markup: {
            inline_keyboard: setAdminAccessLevel(user_id, player.admin)
              .inline_keyboard,
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

    //! notify friends
    bot.hears("اطلاع به دوستان📣", async (ctx) => {
      let access = await hasAccessFeature(ctx.from.id, "notify_friends");
      if (!access) return;
      let friends = await getUserFriends(ctx.from.id);
      friends = friends.filter(
        (item) =>
          access.match.players
            .map((_) => (item !== ctx.from.id && _.id ? item : undefined))
            .filter((item) => item)
            .includes(item) === false
      );
      if (friends.length === 0) {
        ctx.reply(`
یافت نشد!

دلایل یافت نشدن:
1. ممکن است در ربات دوستی نداشته باشید
2. دوستان شما در بازی فعلی وجود دارند
`);
        return;
      }

      const keyboard = new InlineKeyboard().row({
        text: "اطلاع به تمام دوستان",
        callback_data: `submit_notify_friend ALL`,
      });
      let users = [];
      for (let i = 0; i < friends.length; i++) {
        let userChat = await bot.api.getChat(friends[i]);
        users.push({
          callback_data: `submit_notify_friend ${userChat.id}`,
          text: userChat.first_name,
        });
      }

      for (let i = 0; i < users.length; i++) {
        let nd = users.splice(0, 2);
        keyboard.row(...nd);
      }
      ctx.reply("انتخاب کن که می خوای کدوم دوستات رو به بازیت دعوت کنی", {
        reply_markup: {
          inline_keyboard: keyboard.inline_keyboard,
        },
      });
    });

    //! change game mode
    let gameModes = ["شخصی کردن بازی🔑", "عمومی کردن بازی🌍"];
    for (let i = 0; i < gameModes.length; i++) {
      bot.hears(gameModes[i], async (ctx) => {
        const result = await changeGameMode(ctx.from.id);
        if (!result || !result?.mode) return;
        result.access.match.players.map((item) => {
          bot.api.sendMessage(
            item.id,
            `حالت بازی آپدیت شد
    حالت جدید : ${result.mode === "public" ? "عمومی" : "شخصی"}`,
            {
              reply_markup: {
                keyboard: item.isOwner
                  ? newGameFriendshipKeyboard(result.mode).keyboard
                  : newGameAdminKeyboard(item.admin, result.mode).keyboard,
                resize_keyboard: true,
              },
            }
          );
        });
      });
    }
  }
}

module.exports = Friendship;
