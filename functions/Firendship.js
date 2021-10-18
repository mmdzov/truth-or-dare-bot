const { InlineKeyboard, Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("../config/require");
const {
  getFriendRequest,
  finishGameKeyboard,
} = require("../keyboard/finish_game_keyboard");
const {
  setAdminAccessLevel,
  newGameAdminKeyboard,
  newGameFriendshipKeyboard,
  newPlayerInlineSetting,
  limitGameMenuKeyboard,
} = require("../keyboard/friendship-keyboard");
const mainKeyboard = require("../keyboard/main-keyboard");
const { inviteToGameQuestion } = require("../keyboard/question");
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
  checkPlayerAdmin,
  startGame,
  checkUserInGame,
  joinUserToFriendMatch,
  getPlayersMatch,
  saveMessagePlayer,
  sendMessageChangeTurn,
  playerChangeTurn,
  leavePlayerBeforeStart,
} = require("../model/friends-match-model");
const { deleteMatch } = require("../model/match-model");
const {
  getUserFriends,
  addReport,
  getUserReports,
  sendRequest,
  acceptRequest,
  rejectRequest,
  inviteToGame,
  rejectInvite,
} = require("../model/user-model");
const joinGame = require("../utils/joinGame");
const general = require("./General");
const { advanceSend } = require("./msg");

let ignore_keyboards = [
  "👥گفتگو با بازیکنان",
  "🗣گفتگو با بازیکن خاص",
  "⚠️گزارش بازیکن",
  "❗️ گزارش بازی",
  "📝جزئیات بازی",
  "🚷ترک بازی",
  "بازگشت",
  "بازیکنان👥",
  "خروج",
  "شروع بازی🎮",
  "گفتگو💬",
  "اطلاع به دوستان📣",
  "محدودیت بازی📝",
  "ایجاد/تغییر لینک اختصاصی🔏",
  "ایجاد/تغییر لینک سریع🔏",
  "دریافت لینک بازی🗳",
  "لغو و بازگشت",
  "خروج از بازی",
  "حذف بازی",
  "درخواست اتمام",
  "شخصی کردن بازی🔑",
  "بپرس🗣",
  "عمومی کردن بازی🌍",
];

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

  exec(storage) {
    //! handle promote player
    bot.on("callback_query:data", async (ctx, next) => {
      const promote_data = ctx.callbackQuery.data;
      if (!promote_data.includes("promotePlayer_friendship")) return next();
      const user_id = +promote_data.match(/[0-9]/g).join("");
      let result = await findFriendMatch(ctx.from.id);
      if (!result) return next();
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
      // removeAndBanPlayer_friendship
      if (
        !ctx.callbackQuery.data.includes("removePlayer_friendship") &&
        !ctx.callbackQuery.data.includes("removeAndBanPlayer_friendship")
      )
        return next();
      const user_id = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
      const userChat = await bot.api.getChat(user_id);
      if (ctx.callbackQuery.data.includes("removeAndBanPlayer_friendship")) {
        let resultBan = await addReport(user_id, {
          user_id: ctx.from.id,
          message: "Banned from match",
        });
        if (resultBan?.alreadyReported) {
          ctx.reply("درحال حاظر بازیکن مسدود شده");
        }
        if (resultBan?.report) {
          ctx.reply(`بازیکن ${userChat.first_name} مسدود شد`);
        }
      }
      let result = await removePlayer(ctx.from.id, user_id);
      if (result?.not_exist) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "این بازیکن در بازی وجود ندارد",
        });
        return next();
      }
      if (!result?.players) return next();
      result.players.map((item) => {
        if (item.id !== ctx.from.id && item.id !== userChat.id) {
          bot.api.sendMessage(
            item.id,
            `
          بازیکن ${userChat.first_name} توسط ${ctx.from.first_name} از بازی حذف شد`
          );
        } else if (item.id === ctx.from.id) {
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
            keyboard: newGameAdminKeyboard(
              result.match,
              result.admin,
              result.match.mode
            ).keyboard,
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
          access.match.players.some((_) => _.id === item) === false && item
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
          text: userChat?.first_name ?? "",
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

    //! submit notify friends
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("submit_notify_friend"))
        return next();
      const match = await findFriendMatch(ctx.from.id);

      let preventSendLength = 0;

      if (ctx.callbackQuery.data.includes("ALL")) {
        let friends = await getUserFriends(ctx.from.id);
        if (friends?.length === 0) return next();
        let friendFiltered = [];
        for (let i = 0; i < friends?.length; i++) {
          let result = await checkUserInGame(friends[i]);
          if (!result?.user_in_game) {
            friendFiltered.push(friends[i]);

            const inviteResult = await inviteToGame(friends[i], {
              user_id: ctx.from.id,
              match_id: match._id,
            });

            if (inviteResult?.already_sended) {
              preventSendLength += 1;
              continue;
            }

            await bot.api.sendMessage(
              friends[i],
              `دوستت ${ctx.from.first_name} تو رو به بازی دعوت کرده`,
              {
                reply_markup: {
                  inline_keyboard: inviteToGameQuestion(ctx.from.id)
                    .inline_keyboard,
                },
              }
            );
          }
        }

        if (preventSendLength >= friends.length) {
          ctx.answerCallbackQuery({
            text: `قبلا به تمام دوستات درخواست فرستادی منتظر پاسخ باش`,
          });
          return next();
        }

        if (friendFiltered.length === 0) {
          ctx.answerCallbackQuery({
            text: `دوستانت همگی مشغول بازی هستند`,
          });
          return next();
        }

        if (friendFiltered.length >= 1) {
          ctx.answerCallbackQuery({
            text: "پیغام دعوت برای دوستات ارسال شد",
          });
        }

        ctx.answerCallbackQuery({
          text: "پیغام دعوت برای دوستانت ارسال شد",
        });

        return next();
      }

      const userId = +ctx.callbackQuery.data.match(/[0-9]/g).join("");

      //! check user in game
      let result = await checkUserInGame(userId);
      if (result?.user_in_game) {
        ctx.answerCallbackQuery({
          text: `درحال حاظر دوست شما در بازی دیگری است`,
        });
        return next();
      }
      //! end check user in game

      const inviteResult = await inviteToGame(userId, {
        user_id: ctx.from.id,
        match_id: match._id,
      });

      if (inviteResult?.already_sended) {
        ctx.answerCallbackQuery({
          text: "قبلا به این بازیکن درخواست فرستادی . منتظر باش تا به درخواستت پاسخ بده",
        });
        return next();
      }

      bot.api.sendMessage(
        userId,
        `دوستت ${ctx.from.first_name} تو رو به بازی دعوت کرده`,
        {
          reply_markup: {
            inline_keyboard: inviteToGameQuestion(ctx.from.id).inline_keyboard,
          },
        }
      );

      ctx.answerCallbackQuery({
        text: `پیام دعوت برای دوستت ارسال شد`,
      });
      return next();
    });

    //!submit invite game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes(`accept_invite_join_game`))
        return next();
      const userId = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
      let result = await checkUserInGame(ctx.from.id);
      if (result?.user_in_game) {
        ctx.answerCallbackQuery({
          text: `درحال حاظر شما در یک بازی شرکت کردید`,
        });
        return next();
      }
      let fm = await findFriendMatch(userId);
      let res = await joinUserToFriendMatch(fm.secret_link, ctx.from);
      await joinGame(ctx, res);
      await rejectInvite(ctx.from.id, userId);
      try {
        ctx.deleteMessage();
      } catch (e) {}
      return next();
    });

    //! reject invite game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes(`reject_invite_join_game`))
        return next();
      const userId = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
      await rejectInvite(ctx.from.id, userId);
      await bot.api.sendMessage(
        userId,
        `دوستت ${ctx.from.first_name} دعوت بازی رو رد کرد`
      );
      await ctx.answerCallbackQuery({
        text: "دعوت بازی توسط شما لغو شد",
      });
      try {
        ctx.deleteMessage();
      } catch (e) {}
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
                  ? newGameFriendshipKeyboard(
                      result.match,
                      result.mode,
                      result.match.turn.from.id === ctx.from.id
                    ).keyboard
                  : newGameAdminKeyboard(result.match, item.admin, result.mode)
                      .keyboard,
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
      let res = await new general().findMatchExist(ctx);
      if (res?.isTrue) {
        ctx.reply(
          "درحال حاظر شما در یک بازی شرکت کرده اید اگر نمی توانید به منوی بازی برگردید بر روی /comeback یک بار بزنید"
        );
        return next();
      }
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
      let { players } = await getPlayersMatch(
        ctx.callbackQuery.data.split(" ")[1]
      );
      players = players?.map((item) => {
        return item?.id;
      });
      let userReports = await getUserReports(ctx.from.id);
      let hasReported =
        players
          .map((item) => {
            if (userReports.includes(item)) return true;
          })
          .filter((item) => item === true).length > 0;

      const result = await openPublicMatch(
        ctx.callbackQuery.data.split(" ")[1],
        ctx.from
      );
      if (hasReported) {
        ctx.answerCallbackQuery({
          text: `نمی توانید وارد شوید یکی از بازیکنان این بازی شما را مسدود کرده`,
        });
        return;
      }
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
            keyboard: newGameAdminKeyboard(result.match).keyboard,
            resize_keyboard: true,
          },
        });
        result?.players.map((item) => {
          if (item.id === ctx.from.id) return;
          if (result?.match?.started && result.players.length === 2) {
            bot.api.sendMessage(
              result.match.turn.from.id,
              `قرار است ${result.match.turn.to.first_name} را به چالش بکشید
حالا روی دکمه ی بپرس بزن تا شجاعت یا حقیقت رو انتخاب کنه`,
              {
                reply_markup: {
                  keyboard: newGameFriendshipKeyboard(
                    result?.match,
                    result?.match?.mode,
                    true
                  ).keyboard,
                  resize_keyboard: true,
                },
              }
            );
            ctx.reply(
              `شما شرکت کننده دوم در این بازی هستی صبر کن تا بازیکن ${result.match.turn.from.first_name} ازت بپرسه شجاعت یا حقیقت`
            );
          }

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
      ctx.reply("پیام شما برای تمام بازیکنان ارسال شد").then((res) => {
        setTimeout(() => {
          try {
            bot.api.deleteMessage(res.message_id);
          } catch (e) {}
        }, 1500);
      });
      return next();
    });

    //! limit game
    bot.hears("محدودیت بازی📝", async (ctx, next) => {
      return next();
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
      return next();
    });

    //! set limit game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("limit-game-")) return next();
      const match = await findFriendMatch(ctx.from.id);
      let res = await checkPlayerAdmin(match._id, ctx.from.id);
      if (!res || !res.admin.read_write_limits) return next();
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

    //! start game
    bot.hears("شروع بازی🎮", async (ctx, next) => {
      let result = await startGame(ctx.from.id);
      if (!result) return next();

      result.players.map((item) => {
        if (
          item.id !== result.turn.from.id &&
          item.id !== result.turn?.to?.id
        ) {
          bot.api.sendMessage(
            item.id,
            `بازی توسط ${ctx.from.first_name} شروع شد`,
            {
              reply_markup: {
                keyboard: newGameAdminKeyboard(result, item.admin, result.mode)
                  .keyboard,
                resize_keyboard: true,
              },
            }
          );
        } else {
          if (!result?.turn?.to) {
            ctx.reply(
              `بازی توسط شما شروع شد
درحال حاظر جز شما بازیکن دیگری در بازی نیست
اگر در بازی دوستی دارید بر روی اطلاع به دوستان بزنید تا دوستان شما وارد بازی شوند همچنین می توانید برای بازی خود لینک ایجاد کنید و آن را برای دوستانتان بفرستید تا در بازی شما مشارکت داشته باشند و تجربه بازی خوبی رو داشته باشید.
همچنین می توانید بازی خود را عمومی کنید و منتظر بمانید تا دیگر بازیکنان به بازی شما بپیوندند`,
              {
                reply_markup: {
                  keyboard: newGameFriendshipKeyboard(
                    result,
                    result.mode,
                    false
                  ).keyboard,
                  resize_keyboard: true,
                },
              }
            );
          } else if (item.id === result.turn.from.id) {
            ctx.reply(
              `بازی توسط شما شروع شد و قرار است ${result.turn.to.first_name} را به چالش بکشید 
  حالا روی دکمه ی بپرس بزن تا شجاعت یا حقیقت رو انتخاب کنه`,
              {
                reply_markup: {
                  keyboard: newGameFriendshipKeyboard(result, result.mode, true)
                    .keyboard,
                  resize_keyboard: true,
                },
              }
            );
          }
        }
      });
      if (!result?.turn?.to) return next();

      const player = result.players.filter(
        (item) => item.id === result.turn.to.id
      )[0];
      
      bot.api.sendMessage(
        result.turn.to.id,
        `
قراره ${result.turn.from.first_name} تو رو به چالش بکشونه منتظر باش ازت بپرسه شجاعت یا حقیقت`,
        {
          reply_markup: {
            keyboard: newGameAdminKeyboard(result, player.admin, result.mode)
              .keyboard,
            resize_keyboard: true,
          },
        }
      );

      result.players.map((item) => {
        if (item.id !== result.turn.from.id && item.id !== result.turn.to.id) {
          ctx.reply(
            `قراره که ${result.turn.from.first_name} از ${result.turn.to.first_name} بپرسه شجاعت یا حقیقت`
          );
        }
      });

      return next();
    });

    //! ask button
    bot.hears("بپرس🗣", async (ctx, next) => {
      const match = await findFriendMatch(ctx.from.id);
      if (!match || match?.turn?.from?.id !== ctx.from.id || !match?.turn?.to)
        return next();
      if (match.turn?.to?.mode?.length > 0) {
        ctx.reply(
          `دوست من قبلا یک بار ازش پرسیدی و ${
            match.turn?.to?.mode === "dare" ? "شجاعت" : "حقیقت"
          } رو انتخاب کرده حالا کاری که می خوای انجام بده رو بهش بگو`
        );
        return next();
      }
      const { from, to } = match.turn;
      let chatDisable = { hasTurn: false, chat: false };
      ctx.session.friend_game.chat = chatDisable;
      try {
        let sessionTo = storage.read(to.id + "");
        sessionTo.friend_game.chat = chatDisable;
        storage.write(to.id, sessionTo);
      } catch (e) {}

      //! IMPORTANT
      bot.api.sendMessage(
        to.id,
        `
خب... ${match.turn.from.first_name} ازت پرسید
حالا یکی رو انتخاب کن`,
        {
          reply_markup: {
            keyboard: new Keyboard().text("شجاعت").row().text("حقیقت").keyboard,
            resize_keyboard: true,
          },
        }
      );
    });

    //! play game send question truth / command dare
    bot.on("message", async (ctx, next) => {
      const result = await findFriendMatch(ctx.from.id);
      if (!result) return next();
      if (ignore_keyboards?.includes(ctx.message?.text)) return next();
      const saveMsgResult = await saveMessagePlayer(ctx.from.id, {
        ...ctx.message,
      });
      if (!saveMsgResult) return next();
      let turn = {};
      for (let i in saveMsgResult.turn) {
        if (saveMsgResult.turn[i]?.turn) turn = saveMsgResult.turn[i];
      }
      if (turn?.id !== ctx.from.id) return next();
      await advanceSend(
        ctx,
        ctx.from.id + "",
        new InlineKeyboard().row({
          text: "ارسال به بازیکن",
          callback_data: `send_to_player ${ctx.from.id}`,
        })
      );
      return next();
    });

    //! send message to player and run turn
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("send_to_player")) return next();
      let result = await sendMessageChangeTurn(ctx.from.id);
      if (result?.player_notfound) {
        ctx.answerCallbackQuery({
          text: "بازیکن مقابل یافت نشد",
        });
        return next();
      } else if (result?.turn === false) {
        ctx.answerCallbackQuery({
          text: "درحال حاظر نوبت شما نیست",
        });
        return next();
      }

      const { data } = result?.turn;
      result.match.players.map(async (item) => {
        if (item.id !== data.id) {
          const payload = JSON.parse(result.turn.data.payload);
          const turn = result.turn;
          await advanceSend(
            {
              message: {
                ...payload,
                caption: `
از طرف بازیکن ${turn.data.first_name} به بازیکن ${turn.prev_data.first_name}

${payload?.caption ?? ""}
`,
                text: `
از طرف بازیکن ${turn.data.first_name} به بازیکن ${turn.prev_data.first_name}

${payload?.text ?? ""}
`,
              },
            },
            item.id + "",
            new InlineKeyboard().row({
              text: "گزارش پیغام",
              callback_data: `report_message_friend_game ${ctx.from.id}`,
            })
          );
          return;
        }
        ctx.answerCallbackQuery({
          text: "پیغام شما ارسال شد",
        });
        ctx.editMessageReplyMarkup({
          reply_markup: {
            inline_keyboard: new InlineKeyboard().row({
              text: "با موفقیت ارسال شده",
              callback_data: "successfully_sended",
            }).inline_keyboard,
          },
        });
      });
      const newTurn = await playerChangeTurn(ctx.from.id, ctx);
      if (!newTurn?.turn) return;
      const turn = newTurn?.turn;

      let turnIds = [];

      for (let i in turn) {
        turnIds.push(turn[i].id);
        const item = newTurn.players.filter(
          (item) => item.id === turn[i].id
        )[0];
        if (turn[i]?.turn === true) {
          bot.api.sendMessage(
            item.id,
            `
نوبت شما است تا از ${
              turn[i === "from" ? "to" : "from"].first_name
            } بپرسید شجاعت یا حقیقت.
برای پرسیدن روی دکمه بپرس بزنید`,
            {
              reply_markup: {
                keyboard: item.isOwner
                  ? newGameFriendshipKeyboard(
                      newTurn,
                      newTurn.mode,
                      turn.from.id === ctx.from.id
                    ).keyboard
                  : newGameAdminKeyboard(
                      newTurn,
                      item.admin,
                      newTurn.mode,
                      true
                    ).keyboard,
                resize_keyboard: true,
              },
            }
          );
        } else if (turn[i]?.turn === false) {
          bot.api.sendMessage(
            item.id,
            `
نوبت شما است تا بازیکن ${
              turn[i === "from" ? "to" : "from"].first_name
            } از شما بپرسد شجاعت یا حقیقت.
لطفا کمی منتظر بمانید تا از شما بپرسد`,
            {
              reply_markup: {
                keyboard: item.isOwner
                  ? newGameFriendshipKeyboard(newTurn, newTurn.mode, false)
                      .keyboard
                  : newGameAdminKeyboard(
                      newTurn,
                      item.admin,
                      newTurn.mode,
                      false
                    ).keyboard,
                resize_keyboard: true,
              },
            }
          );
        }
      }
      newTurn.players.map((item) => {
        if (!turnIds.includes(item.id)) {
          bot.api.sendMessage(
            item.id,
            `نوبت ها تغییر کرد.
    درحال حاظر ${newTurn.turn.from.first_name} از ${newTurn.turn.to.first_name} می پرسه شجاعت یا حقیقت`,
            {
              reply_markup: {
                keyboard: item.isOwner
                  ? newGameFriendshipKeyboard(newTurn, newTurn.mode, false)
                      .keyboard
                  : newGameAdminKeyboard(newTurn, item.admin, newTurn.mode)
                      .keyboard,
                resize_keyboard: true,
              },
            }
          );
        }
      });
      return next();
    });

    //! player report message
    bot.on("callback_query:data", (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("report_message_friend_game"))
        return next();

      return next();
    });

    //! send Request to add friend
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("send_request_add_friend"))
        return next();
      const userChat = await bot.api.getChat(
        +ctx.callbackQuery.data.match(/[0-9]/g).join("")
      );
      const friends = await getUserFriends(ctx.from.id);
      if (friends.includes(userChat.id)) {
        ctx.answerCallbackQuery({ text: "بازیکن اکنون دوست شماست" });
        return next();
      }
      let result = await sendRequest(ctx.from.id, userChat.id);
      if (!result) {
        ctx.answerCallbackQuery({
          text: "شما یک بار درخواست دوستی فرستادید منتظر پاسخ بازیکن باشید",
        });
        return next();
      }
      bot.api.sendMessage(
        userChat.id,
        `یک بازیکن به نام ${ctx.callbackQuery.from.id} برای شما درخواست دوستی ارسال کرد`,
        {
          reply_markup: {
            inline_keyboard: getFriendRequest(ctx.from.id).inline_keyboard,
          },
        }
      );
      ctx.answerCallbackQuery({
        text: `درخواست دوستی برای بازیکن ${userChat.first_name} ارسال شد`,
      });
      return next();
    });

    //! accept request add friend
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("accept_request_to_add_friend"))
        return next();
      const userChat = await bot.api.getChat(
        +ctx.callbackQuery.data.match(/[0-9]/g).join("")
      );
      let result = await acceptRequest(ctx.from.id, userChat.id);
      if (result) {
        await ctx.answerCallbackQuery({
          text: `بازیکن ${userChat.first_name} به لیست دوستان شما اضاف شد`,
        });

        bot.api.sendMessage(
          userChat.id,
          `بازیکن ${ctx.from.first_name} درخواست دوستی شما را قبول کرد`
        );
        return next();
      }
      ctx.answerCallbackQuery({
        text: "در قبول کردن درخواست دوستی مشکلی پیش آمد",
      });
      return next();
    });

    //! reject request add friend
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("reject_request_to_add_friend"))
        return next();
      const userChat = await bot.api.getChat(
        +ctx.callbackQuery.data.match(/[0-9]/g).join("")
      );
      let result = await rejectRequest(ctx.from.id, userChat.id);
      if (!result) {
        ctx.answerCallbackQuery({
          text: "در رد کردن درخواست دوستی مشکلی پیش آمد",
        });
        return next();
      }
      await ctx.answerCallbackQuery({
        text: `درخواست دوستی لغو شد`,
      });
      try {
        ctx.deleteMessage();
      } catch (e) {}
      bot.api.sendMessage(
        userChat.id,
        `بازیکن ${ctx.from.first_name} درخواست دوستی شما را رد کرد`
      );
      return next();
    });

    //! delete game notification
    bot.hears("حذف بازی", async (ctx, next) => {
      const friendMatch = await findFriendMatch(ctx.from.id);
      if (!friendMatch) return next();
      if (ctx.from.id !== +friendMatch.owner) return next();
      ctx.reply("آیا واقعا می خواهید بازی فعلی حذف شود؟", {
        reply_markup: {
          inline_keyboard: new InlineKeyboard().row(
            { text: "خیر", callback_data: "no_deleteGame" },
            { text: "بله حذف شود", callback_data: "yes_deleteGame" }
          ).inline_keyboard,
        },
      });
      return next();
    });

    //! cancel delete game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("no_deleteGame")) return next();
      ctx.answerCallbackQuery({
        text: "حذف بازی لغو شد",
      });
      try {
        ctx.deleteMessage();
      } catch (e) {}
      return next();
    });

    //! force delete game
    bot.on("callback_query:data", async (ctx, next) => {
      if (!ctx.callbackQuery.data.includes("yes_deleteGame")) return next();
      const result = await deleteMatch(ctx.from.id);
      if (result === false) return next();
      result.players.map((item) => {
        bot.api
          .sendMessage(item.id, `بازی به اتمام رسید به منوی اصلی بازگشتید`, {
            reply_markup: {
              keyboard: mainKeyboard.keyboard,
              resize_keyboard: true,
            },
          })
          .then(async (res) => {
            const finishedGame = await finishGameKeyboard(
              result.players,
              ctx.from.id
            );
            bot.api.sendMessage(item.id, `لیست بازیکنان بازی قبلی`, {
              reply_markup: {
                inline_keyboard: finishedGame.inline_keyboard,
              },
            });
          });
      });
      return next();
    });

    //! leave game before start
    bot.hears("خروج", async (ctx, next) => {
      const match = await findFriendMatch(ctx.from.id);
      if (!match) return next();
      if (match.started) {
        ctx.reply(
          "بازی شروع شده تنها زمانی می توانیید خارج شوید که درخواست اتمام بازی را بدهید و با رای اکثریت بازی به اتمام برسد"
        );
        return next();
      }
      const result = await leavePlayerBeforeStart(ctx.from.id);
      if (result === false) return next();
      ctx.reply("شما از بازی خارج شدید و به منوی اصلی بازگشتید", {
        reply_markup: {
          keyboard: mainKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
      result.players.map((item) => {
        bot.api.sendMessage(
          item.id,
          `بازیکن ${ctx.from.first_name} از بازی خارج شد

تعداد بازیکنان باقیمانده : ${result.players?.length}`
        );
      });
      return next();
    });
  }
}

module.exports = Friendship;
