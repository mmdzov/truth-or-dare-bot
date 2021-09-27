const { InlineKeyboard, Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("../config/require");
const {
  setAdminAccessLevel,
  newGameAdminKeyboard,
  newGameFriendshipKeyboard,
  newPlayerInlineSetting,
  limitGameMenuKeyboard,
} = require("../keyboard/friendship-keyboard");
const mainKeyboard = require("../keyboard/main-keyboard");
const friendsMatchModel = require("../model/friends-match-model");
const {
  getAllPlayers,
  changePlayerAccess,
  hasAccessFeature,
  changeGameMode,
  findFriendMatch,
  hasOwnerPlayer,
  removePlayer,
  createModifyLink,
  changeLimitStatus,
  getPublicMatchs,
  openPublicMatch,
  getMatchLimits,
} = require("../model/friends-match-model");
const { getUserFriends } = require("../model/user-model");

class Friendship {
  async readyPlayers(ctx, editMode = false) {
    let players = await getAllPlayers(null, ctx.from.id);
    players = players.filter((item) => item !== ctx.from.id);
    if (players.length === 0) {
      ctx.reply("هنوز بازیکنی در این بازی شرکت نکرده است");
      return;
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

  async openGameList(ctx) {
    const keyboard = new InlineKeyboard();
    const matchs = await getPublicMatchs();
    if (matchs.length === 0) return { not_exist: true };
    const matchLength = matchs.length;
    let newTrimedMatchs = matchs.splice(ctx.session.friend_game.page.index, 10);
    if (newTrimedMatchs.length === 0) {
      ctx.session.friend_game.page.index = 0;
      newTrimedMatchs = matchs.splice(0, 10);
    }

    keyboard.row(
      {
        text: "ورود",
        callback_data: `open_friend_game`,
      },
      {
        text: "بازیکنان",
        callback_data: "player_length_friend_game",
      },
      {
        text: "نام بازی",
        callback_data: "friend_game_name",
      },
      {
        text: "شروع شده؟",
        callback_data: "has_started_friend_game",
      }
    );

    newTrimedMatchs.map((item) => {
      keyboard.row(
        {
          text: "ورود🚪",
          callback_data: `open_friend_game ${item.match_id}`,
        },
        {
          text: item.playerLength,
          callback_data: "player_length_friend_game",
        },
        {
          text:
            item.name.length > 20 ? item.name.slice(0, 20) + "..." : item.name,
          callback_data: "friend_game_name",
        },
        {
          text: item?.started ? "✅" : "⏱",
          callback_data: "has_started_friend_game",
        }
      );
    });
    if (matchLength > 10) {
      keyboard.row({
        text: "صفحه بعد",
        callback_data: "next_page_friend_match",
      });
    }

    if (ctx.session.friend_game.page.index > 0) {
      keyboard.row({
        text: "صفحه قبل",
        callback_data: "prev_page_friend_match",
      });
    }
    return keyboard;
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

    //! remove user callback
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("removePlayer_friendship"))
        return next();
      const user_id = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
      const userChat = await bot.api.getChat(user_id);
      let result = await removePlayer(ctx.from.id, user_id);
      if (result?.not_exist) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "این بازیکن در بازی وجود ندارد",
        });
        return next();
      }
      if (!result?.players) return next();
      result.players.map((item) => {
        if (item.id !== ctx.from.id) {
          bot.api.sendMessage(
            item.id,
            `
          بازیکن ${userChat.first_name} توسط ${ctx.from.first_name} از بازی حذف شد`
          );
        } else {
          bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
            text: "بازیکن توسط شما از بازی حذف شد",
          });
        }
      });
      bot.api.sendMessage(
        user_id,
        `
شما توسط ${ctx.from.first_name} از بازی دوستانه حذف شدید و به منوی اصلی بازگشتید`,
        {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        }
      );
      return next();
    });

    //! cancel and back
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
      bot.api.sendMessage(
        user_id,
        `
${datas[index].title} برای شما ${
          result.changed[Object.keys(result.changed)[0]]
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
    bot.hears("اطلاع به دوستان📣", async (ctx, next) => {
      let access = await hasAccessFeature(ctx.from.id, "notify_friends");
      if (!access) return next();
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
        return next();
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
      return next();
    });

    //! change game mode
    let gameModes = ["شخصی کردن بازی🔑", "عمومی کردن بازی🌍"];
    for (let i = 0; i < gameModes.length; i++) {
      bot.hears(gameModes[i], async (ctx, next) => {
        const result = await changeGameMode(ctx.from.id);
        if (!result || !result?.mode) return next();
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
        return next();
      });
    }

    //! create/modify private-link
    bot.hears("ایجاد/تغییر لینک اختصاصی🔏", async (ctx, next) => {
      let result = await hasAccessFeature(ctx.from.id, "change_link");
      if (!result) return next();

      ctx.session.friend_game.change_link = true;
      ctx.reply(`
لینک جدید را با # ارسال کنید:

نمونه لینک : #new_link_address`);
      return next();
    });

    bot.on("message::hashtag", async (ctx, next) => {
      if (!ctx.session.friend_game.change_link) return next();
      const trimTag = ctx.message.text.split("#").join("").trim();
      let result = await createModifyLink(ctx.from.id, trimTag);
      if (!result) return;
      if (result?.alreadyExist) {
        ctx.reply("این لینک درحال حاظر در بازی دیگری ثبت شده.");
        return;
      }
      if (result?.updated) {
        ctx.reply(`لینک بازی با موفقیت توسط شما بروزرسانی شد.
        
لینک جدید : 
t.me/jorathaqiqatonline_bot?start=friendship_match${trimTag}`);
        result.players.map((item) => {
          bot.api.sendMessage(
            item.id,
            `لینک بازی با موفقیت توسط ${ctx.from.first_name} بروزرسانی شد.
        
لینک جدید : 
t.me/jorathaqiqatonline_bot?start=friendship_match${trimTag}`
          );
        });
      }
      return next();
    });

    //! create/modify random-link
    bot.hears("ایجاد/تغییر لینک سریع🔏", async (ctx, next) => {
      let result = await hasAccessFeature(ctx.from.id, "change_link");
      if (!result) return next();

      const random_link = customAlphabet(
        "1234567890abcdefghijklmnopqrstuvwxyzQWERTYUIOPASDFGHJKLZXCVBNM",
        12
      )();

      let _result = await createModifyLink(ctx.from.id, random_link);
      if (!_result) return next();

      if (_result?.alreadyExist) {
        ctx.reply("این لینک درحال حاظر در بازی دیگری ثبت شده.");
        return next();
      }

      if (_result?.updated) {
        ctx.reply(`لینک بازی با موفقیت توسط شما بروزرسانی شد.
            
لینک جدید : 
t.me/jorathaqiqatonline_bot?start=friendship_match${random_link}`);
        _result.players.map((item) => {
          bot.api.sendMessage(
            item.id,
            `لینک بازی با موفقیت توسط ${ctx.from.first_name} بروزرسانی شد.
            
لینک جدید : 
t.me/jorathaqiqatonline_bot?start=friendship_match${random_link}`
          );
        });
      }
      return next();
    });

    //!get link
    bot.hears("دریافت لینک بازی🗳", async (ctx, next) => {
      const result = await findFriendMatch(ctx.from.id);
      if (!result) return next();
      ctx.reply(`لینک بازی فعلی: 

t.me/jorathaqiqatonline_bot?start=friendship_match${result?.secret_link}`);
      return next();
    });

    //!open game
    bot.hears("ورود به بازی🚪", async (ctx, next) => {
      const result = await findFriendMatch(ctx.from.id);
      if (result) return next();
      const keyboard = await this.openGameList(ctx);
      if (keyboard?.not_exist) {
        ctx.reply("هنوز بازی در دسترس نیست");
        return next();
      }
      ctx.reply("بازی های عمومی در دسترس", {
        reply_markup: {
          inline_keyboard: keyboard.inline_keyboard,
        },
      });
      return next();
    });

    //! select next page open-game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("next_page_friend_match"))
        return next();
      ctx.session.friend_game.page.index += 10;
      let keyboard = await this.openGameList(ctx);
      ctx.editMessageReplyMarkup({
        reply_markup: {
          inline_keyboard: keyboard.inline_keyboard,
        },
      });
      return next();
    });

    //! select previous page open-game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("prev_page_friend_match"))
        return next();
      ctx.session.friend_game.page.index -= 10;
      let keyboard = await this.openGameList(ctx);
      ctx.editMessageReplyMarkup({
        reply_markup: {
          inline_keyboard: keyboard.inline_keyboard,
        },
      });
      return next();
    });

    //!finally open game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("open_friend_game")) return next();
      const result = await openPublicMatch(
        ctx.callbackQuery.data.split(" ")[1],
        ctx.from
      );
      if (result.alreadyJoinedAMatch) {
        ctx.answerCallbackQuery({ text: "درحال حاظر شما در یک بازی هستید" });
        return next();
      }
      if (result?.not_exist) {
        ctx.answerCallbackQuery({
          text: "بازی به اتمام رسیده",
        });
        return next();
      }
      if (result?.is_private) {
        ctx.answerCallbackQuery({
          text: "این بازی شخصی شده و نمی توانید وارد شوید",
        });
        return next();
      }
      if (result?.joined === true) {
        ctx.reply(`شما وارد بازی شدید`, {
          reply_markup: {
            keyboard: newGameAdminKeyboard().keyboard,
            resize_keyboard: true,
          },
        });
        result?.players.map((item) => {
          if (item.id === ctx.from.id) return;
          if (!item.isOwner) {
            bot.api
              .sendMessage(
                item.id,
                `
    کاربر جدید ${ctx.from.first_name} وارد بازی شد`
                // {
                //   reply_markup: {
                //     inline_keyboard: newPlayerInlineSetting(
                //       ctx.from.id,
                //       false,
                //       item.admin?.remove_player,
                //       item.admin?.limit_player,
                //       item.admin?.add_new_admin
                //     ).inline_keyboard,
                //   },
                // }
              )
              .catch((e) => {});
          } else if (item?.id !== ctx.from.id) {
            bot.api
              .sendMessage(
                item.id,
                `
    کاربر جدید ${ctx.from.first_name} وارد بازی شد`,
                {
                  reply_markup: {
                    inline_keyboard: newPlayerInlineSetting(ctx.from.id, true)
                      .inline_keyboard,
                  },
                }
              )
              .catch((e) => {});
          }
        });
      }
      ctx.editMessageText("بازی های عمومی در دسترس");
      return next();
    });

    //! chats
    bot.hears("گفتگو💬", async (ctx, next) => {
      const match = await findFriendMatch(ctx.from.id);
      if (!match) return next();
      ctx.session.friend_game.chat = {
        hasTurn: false,
        chat: true,
      };
      ctx.reply("هم اکنون می توانید گفتگو کنید", {
        reply_markup: {
          keyboard: new Keyboard().text("بازگشت").keyboard,
          resize_keyboard: true,
        },
      });
      return next();
    });

    bot.on("message", async (ctx, next) => {
      if (!ctx.session.friend_game.chat.chat) return next();
      let ignore_keyboards = [
        "👥گفتگو با بازیکنان",
        "🗣گفتگو با بازیکن خاص",
        "⚠️گزارش بازیکن",
        "❗️ گزارش بازی",
        "📝جزئیات بازی",
        "🚷ترک بازی",
        "بازگشت",
        "بازیکنان آماده👥",
        "شروع بازی🎮",
        "گفتگو💬",
        "اطلاع به دوستان📣",
        "ایجاد/تغییر لینک اختصاصی🔏",
        "ایجاد/تغییر لینک سریع🔏",
        "محدودیت بازی📝",
        "دریافت لینک بازی🗳",
        "لغو و بازگشت",
        "شخصی کردن بازی🔑",
        "عمومی کردن بازی🌍",
      ];
      if (ignore_keyboards.includes(ctx.message.text)) return next();
      const match = await findFriendMatch(ctx.from.id);
      if (!match) return next();
      let players = match.players
        .filter((item) => item.id !== ctx.from.id)
        .map((item) => item.id);
      players.map((item) => {
        bot.api.sendMessage(
          item,
          `
یک پیام از طرف ${ctx.from.first_name}

${ctx.message.text}`
        );
      });
      ctx.reply("پیام شما برای تمام بازیکنان ارسال شد");
      return next();
    });

    //! limit game
    bot.hears("محدودیت بازی📝", async (ctx, next) => {
      const match = await findFriendMatch(ctx.from.id);
      if (!match) return next();
      if (
        match.players.filter((item) => item.id === ctx.from.id)[0].admin
          .read_write_limits === false &&
        +match.owner !== ctx.from.id
      )
        return next();
      let limitKeyboard = limitGameMenuKeyboard(match.match_id, match.limits);
      ctx.reply("منوی محدودیت بازی", {
        reply_markup: { inline_keyboard: limitKeyboard.inline_keyboard },
      });
    });

    //! set limit game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("limit-game-")) return next();
      const match = await findFriendMatch(ctx.from.id);
      if (!match) return next();
      let data = ctx.callbackQuery.data;
      data = data.split("limit-game-");
      data = data.filter((item) => item !== "").join("");
      data = data.split(" ")[0];
      let result = await changeLimitStatus(match, data);
      let limitKeyboard = limitGameMenuKeyboard(match.match_id, result.limits);
      ctx.editMessageReplyMarkup({
        reply_markup: {
          inline_keyboard: limitKeyboard.inline_keyboard,
        },
      });
      return next();
    });
  }
}

module.exports = Friendship;
