const {
  session,
  Keyboard,
  InlineKeyboard,
  MemorySessionStorage,
} = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("./config/require");
const DuoPlay = require("./functions/duoPlay");
const General = require("./functions/General");
const { reply, send } = require("./functions/msg");
const Multiplayer = require("./functions/Multiplayer");
const mainKeyboard = require("./keyboard/main-keyboard");
const { matchPlayingKeyboard } = require("./keyboard/match-keyboard");
const {
  multiplayerMatchKeyboard,
  multiplayerMatchCurrentUserKeyboard,
} = require("./keyboard/multiplayer-match-keyboard");
const playerCountKeyboard = require("./keyboard/playerCount-keyboard");
const { reportKeyboard } = require("./keyboard/report-keyboard");
const selectGender = require("./keyboard/select-gender");
const settingKeyboard = require("./keyboard/setting_keyboard");
const {
  findMatch,
  selectMatchSenderReceiver,
  changeNextTurn,
  setAnswer,
  clearAnswers,
  selectPlayerTurn,
  selectSpecificPlayerTurn,
  selectTruthOrDare,
  checkUserReport,
} = require("./model/match-model");
const { startQueue, findAndNewMatch } = require("./model/queue-model");
const {
  newuser,
  viewUserSetting,
  visibleUserProfile,
  selectGenderUser,
  addUserFriend,
  getUserFriends,
  removeFriend,
} = require("./model/user-model");
const general = new General();
const mtp = new Multiplayer();
const storage = new MemorySessionStorage();
const { hydrateApi, hydrateContext } = require("@grammyjs/hydrate");
const {
  mainFriendshipKeyboard,
  newGameKeyboard,
  newGameFriendshipKeyboard,
  newPlayerInlineSetting,
  newGameAdminKeyboard,
} = require("./keyboard/friendship-keyboard");
const {
  newMatch,
  deleteMatch,
  getAllPlayers,
  joinUserToFriendMatch,
  findFriendMatch,
  getMyFriends,
  leaveFriendGame,
  friendMatchselectTruthOrDare,
  requestToFinish,
  cancelRequestToFinish,
} = require("./model/friends-match-model");
const Friendship = require("./functions/firendship");
const joinGame = require("./utils/joinGame");
const defaultSession = require("./session");
const { finishGameKeyboard } = require("./keyboard/finish_game_keyboard");

bot.use(hydrateContext());
bot.api.config.use(hydrateApi());

bot.use(
  session({
    storage,
    initial() {
      return {
        // ...defaultSession,
        friend_game: {
          new_game: true, //! default false
          change_link: false,
          page: {
            index: 0,
          },
          chat: {
            hasTurn: false,
            chat: false,
          }, //! default false
          new_game_select_name: {},
          promote: {
            user_id: 1820867140, //! default 0
            isAdmin: false,
            notify_friends: false,
            start_game: false,
            change_game_mode: false,
            change_link: false,
            get_link: false,
            add_new_admin: false,
            remove_player: false,
            read_write_limits: false,
            limit_player: false,
          },
        },
        process: {
          players_chat: false,
          player_chat: false,
          report_player: false,
          report_game: false,
          leave_game: false,
        },
        select: undefined,
        waitForAddFriend: false,
        selectGender: false,
        chat: {
          hasTurn: false,
          chat: false,
        },
        privateChat: {},
        waitForFindPlayer: false,
        selectTargetGender: false,
        findPlayer: false,
        report_message: {},
        player: {
          report: false,
          report_message: {},
          inGame: false,
          truthOrDare: {
            truth: false,
            dare: false,
          },
          leave_game: false,
          chat: false,
          count_players: 0,
          limitInPerTurn: 0,
          sended: false,
          prevent_touch: false,
        },
        otherPlayer: {
          truthOrDare: {
            truth: false,
            dare: false,
          },
          done: false,
        },
      };
    },
  })
);

const friendship = new Friendship();

friendship.exec(storage);

bot.command("start", async (ctx, next) => {
  await newuser({
    user_id: ctx.from.id,
    matchs: 0,
    user_unique_id: customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8)(),
    sex: "unavailable",
    visible_profile: false,
  });

  if (ctx.match.includes("friendship_match")) {
    const link = ctx.match.split("friendship_match").join("");
    let result = await joinUserToFriendMatch(link, ctx.from);
    joinGame(ctx, result);
    return next();
  }

  let refferId = +ctx.match.match(/[0-9]/g)?.join("");
  if (refferId) {
    let result = await addUserFriend(ctx.from.id, refferId);
    if (result === true) {
      let getUser = await bot.api.getChat(refferId);
      ctx.reply(`
  دعوت دوستت ${getUser.first_name} با موفقیت پذیرفته شد دوست من`);
      bot.api.sendMessage(
        refferId,
        `دوستت ${ctx.from.first_name} دعوت دوستیت رو قبول کرد`
      );
    }
  }
  ctx.reply(
    `خوش اومدی دوست من 
لطفا یه گزینه انتخاب کن`,
    {
      reply_markup: {
        keyboard: mainKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("بازی جدید🎮", async (ctx, next) => {
  let res = await general.findMatchExist(ctx);
  if (res?.isTrue) {
    ctx.reply(
      "درحال حاظر شما در یک بازی شرکت کرده اید اگر نمی توانید به منوی بازی برگردید بر روی /comeback یک بار بزنید"
    );
    return next();
  }
  ctx.session.friend_game.new_game_select_name = {
    name: "",
    select: true,
  };
  ctx.reply("یک نام کوتاه برای بازی انتخاب کنید.", {
    reply_markup: {
      keyboard: new Keyboard().text("بازگشت").keyboard,
      resize_keyboard: true,
    },
  });
});

bot.hears("دوستان من👨‍👧‍👦", async (ctx, next) => {
  const result = await getMyFriends(ctx.from.id);
  if (result?.not_exist) {
    ctx.reply(`هنوز دوستی ندارید`);
    return next();
  }

  ctx.reply(
    `لیست دوستان شما

توجه: در حذف دوستان خود دقت کنید به محض اینکه روی دکمه ی سطل زدید دوستتان حذف میشود`,
    {
      reply_markup: {
        inline_keyboard: result.keyboard.inline_keyboard,
      },
    }
  );

  return next();
});

bot.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.includes("friend-delete-user")) return next();
  const target = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
  let result = await removeFriend(ctx.from.id, target);
  let userChat = await bot.api.getChat(target);

  if (result?.not_exist) {
    ctx.answerCallbackQuery({
      text: `شخص ${userChat.first_name} قبلا از لیست دوستات حذف کردی`,
    });
    return next();
  }

  if (result?.user_id) {
    ctx.answerCallbackQuery({
      text: `شخص ${userChat.first_name} از لیست دوستات حذف شد`,
    });

    bot.api.sendMessage(
      target,
      `شخص ${ctx.from.first_name} تو رو از لیست دوستاش حذف کرد`
    );

    const myFriendsResult = await getMyFriends(ctx.from.id);
    if (myFriendsResult?.not_exist) {
      ctx.answerCallbackQuery({
        text: "دیگر دوستی ندارید",
      });
      try {
        ctx.deleteMessage();
      } catch (e) {}
      return next();
    }

    ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: myFriendsResult.keyboard.inline_keyboard,
      },
    });
    return next();
  }

  ctx.answerCallbackQuery({
    text: `ای وای! مشکلی پیش اومده لطفا بعدا دوباره امتحان کن`,
  });
  return next();
});

// bot.on("callback_query:data", (ctx, next) => {
// if (!ctx.callbackQuery.data.includes("friend-chat-user")) return next();

// });

bot.on("message", async (ctx, next) => {
  if (
    !ctx.session.friend_game.new_game_select_name?.select ||
    ctx.message.text.includes("بازگشت") ||
    ctx.message.text.includes("بازی جدید🎮")
  )
    return next();
  ctx.session.friend_game.new_game = true;
  let unique_secret = customAlphabet(
    "1234567890abcdefghijklmnopqrstuvwxyz",
    8
  )();
  await newMatch({
    players: [
      {
        ...ctx.from,
        unique_id: customAlphabet(
          "1234567890abcdefghijklmnopqrstuvwxyzQWERTYUIOPASDFGHJKLZXCVBNM",
          12
        )(),
        turn: true,
        date: Math.floor(Date.now() / 1000),
        hiddenMessages: [],
        limits: [],
        isOwner: true,
        admin: {
          isAdmin: false,
          notify_friends: false,
          start_game: false,
          change_game_mode: false,
          change_link: false,
          get_link: false,
          add_new_admin: false,
          remove_player: false,
          read_write_limits: false,
          limit_player: false,
        },
      },
    ],
    name: ctx.message.text,
    created: Math.floor(Date.now() / 1000),
    owner: ctx.from.id + "",
    limits: [
      {
        name: "send-message",
        enabled: true,
      },
      {
        name: "send-voice",
        enabled: true,
      },
      {
        name: "send-video",
        enabled: true,
      },
      {
        name: "send-file",
        enabled: true,
      },
      {
        name: "send-sticker",
        enabled: true,
      },
      {
        name: "send-photo",
        enabled: true,
      },
    ],
    unique_id: unique_secret,
    secret_link: unique_secret,
    bans: [],
    turn: {
      from: ctx.from,
      to: {},
    },
  });

  ctx.session.friend_game.new_game_select_name = {};

  ctx.reply(
    `
منو ها برات فعال شد دوست من میتونی بازی قبل از شروع رو با منو ها مدیریت کنی

دوست من اگر روی دکمه عمومی کردن بازی بزنی , دوستانت اگر زمانی روی ورود به بازی زدند میتوانند بازی شما رو ببینن و واردش بشن
اما درحال حاظر بازی شخصی است و تا زمانی که به دوستات درخواست ارسال نکردی متوجه نمیشن یک بازی رو شروع کردی

لینک سریع : 
t.me/jorathaqiqatonline_bot?start=friendship_match${unique_secret}
`,
    {
      reply_markup: {
        keyboard: newGameFriendshipKeyboard().keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.on("callback_query:data", (ctx, next) => {
  const duoPlay = new DuoPlay(ctx);
  duoPlay.sendRequestToAddFriend(ctx);
  duoPlay.acceptRequestToAddFriend(ctx);
  duoPlay.rejectRequestToAddFriend(ctx);

  return next();
});

bot.hears("لغو و بازگشت", async (ctx, next) => {
  if (ctx.session.friend_game.new_game) {
    await deleteMatch(ctx.from.id);
    ctx.session.friend_game.new_game = false;
    ctx.reply(
      `
  دستورت چیه دوست من`,
      {
        reply_markup: {
          keyboard: mainFriendshipKeyboard.keyboard,
          resize_keyboard: true,
        },
      }
    );
  }
  return next();
});

bot.hears("بازیکنان👥", async (ctx, next) => {
  await friendship.readyPlayers(ctx);
  return next();
});

bot.hears("ایجاد لینک اختصاصی🔏", (ctx, next) => {
  return next();
});

bot.hears("بروز کردن منوی انتظار", (ctx, next) => {
  ctx.reply(
    `منوی انتظار: 
  
منو ها برات بروز شد دوست من میتونی صف بازی قبل از شروع رو با منو ها مدیریت کنی`,
    {
      reply_markup: {
        keyboard: newGameFriendshipKeyboard().keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("بازی آنلاین", (ctx, next) => {
  if (ctx.session.player.prevent_touch) return next();
  ctx.session.select = "online";
  ctx.reply(
    `خیلی خب دوست من
حالا انتخاب کن که می خوای تعداد بازیکن های بازی چند نفر باشن
در بازی دو نفره می تونی انتخاب کنی که جنسیت بازیکن مقابل چی باشه`,
    {
      reply_markup: {
        keyboard: playerCountKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("افزودن دوست", (ctx, next) => {
  ctx.session.waitForAddFriend = true;
  ctx.reply(
    `خیلی خب دوست من
آیدی بازیکن یا یوزرنیم اون خوشبختت رو برام بفرست تا به لیست دوستات اضافش کنم`
  );
  return next();
});

bot.hears("بازگشت", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  ctx.session.friend_game.new_game_select_name = {
    name: "",
    select: false,
  };
  if (ctx.session?.friend_game?.chat?.chat) {
    const _match = await findFriendMatch(ctx.from.id);
    const getUser = _match.players.filter((item) => item.id === ctx.from.id)[0];
    ctx.reply(`دستورت چیه دوست من`, {
      reply_markup: {
        keyboard:
          +_match.owner === ctx.from.id
            ? newGameFriendshipKeyboard(
                _match,
                _match.mode,
                _match.turn.from.id === ctx.from.id
              ).keyboard
            : newGameAdminKeyboard(_match, getUser.admin, _match.mode).keyboard,
        resize_keyboard: true,
      },
    });
    ctx.session.friend_game.chat = { hasTurn: false, chat: false };
    return next();
  }
  if (ctx.session?.chat?.chat) {
    if (!match) return next();
    ctx.session.process.players_chat = false;
    ctx.session.process.player_chat = false;
    ctx.reply(`دستورت چیه دوست من`, {
      reply_markup: {
        keyboard: ctx.session.chat?.hasTurn
          ? multiplayerMatchCurrentUserKeyboard.keyboard
          : multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    ctx.session.chat = {};
    return next();
  }
  if (Object.keys(ctx.session.privateChat)?.length > 0) {
    if (!match) return next();
    ctx.session.process.player_chat = false;
    ctx.reply("به منوی بازی برگشتی دوست من", {
      reply_markup: {
        keyboard: ctx.session.privateChat?.hasTurn
          ? multiplayerMatchCurrentUserKeyboard.keyboard
          : multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    ctx.session.privateChat = {};
    return next();
  }
  if (match) {
    if (ctx.session.selectGender) {
      ctx.reply(`دستورت چیه دوست من`, {
        reply_markup: {
          keyboard: mainKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
    } else if (match.player_numbers === 2) {
      ctx.reply(`دستورت چیه دوست من`, {
        reply_markup: {
          keyboard: mainKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
    } else {
      ctx.reply(`دستورت چیه دوست من`, {
        reply_markup: {
          keyboard:
            match?.question?.from?.id === ctx.from.id
              ? multiplayerMatchCurrentUserKeyboard.keyboard
              : multiplayerMatchKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
    }
  } else {
    ctx.reply(`دستورت چیه دوست من`, {
      reply_markup: {
        keyboard: mainKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
  }
  general.disableAllProcess(ctx);
  return next();
});

bot.hears("مشاهده تنظیمات فعلی", async (ctx, next) => {
  let data = await viewUserSetting(ctx.from.id);
  ctx.reply(
    `
نمایش پروفایل شما برای دیگر بازیکنان : ${
      data.visible_profile ? "فعال" : "غیر فعال"
    }

آیدی بازیکن : ` +
      "`" +
      data.user_unique_id +
      "`" +
      `

جنسیت : ${data.sex === "unavailable" ? "نامشخص" : data.sex}

بازی های شما : ${data.matchs || 0}`,
    { parse_mode: "Markdown" }
  );
  return next();
});

bot.hears("نمایش پروفایل برای بازیکنان", async (ctx, next) => {
  let visibleProfileEnabled = await visibleUserProfile(ctx.from.id);
  ctx.reply(
    `نمایش پروفایل شما برای دیگر بازیکنان ${
      visibleProfileEnabled ? "غیر فعال" : "فعال"
    } شد`
  );
  return next();
});

bot.hears("انتخاب جنسیت", async (ctx, next) => {
  ctx.session.selectGender = true;
  ctx.reply(`انتخاب کن دوست من`, {
    reply_markup: {
      keyboard: selectGender.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("بپرس شجاعت یا حقیقت؟", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (!match || match.player_numbers !== 2) return next();
  let result = await mtp.checkHasSendedQuestion(ctx, match);
  if (result === false) return next();
  let turn = match.players[match.turn - 1];
  if (turn.user_id === ctx.from.id) {
    ctx.reply("ارسال شد منتظر جواب باش دوست من", {
      reply_markup: {
        keyboard: multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    ctx.session.player.sended = true;
    bot.api.sendMessage(match.question.to.id, "شجاعت یا حقیقت؟", {
      reply_markup: {
        keyboard: new Keyboard().text("شجاعت👿").row().text("حقیقت👻").keyboard,
        resize_keyboard: true,
      },
    });
    // await selectSpecificPlayerTurn(ctx.from.id);
  } else {
    ctx.reply("دوست من, هنوز نوبتت نشده");
  }
  return next();
});

bot.hears("شجاعت👿", async (ctx) => {
  let match = await findMatch(ctx.from.id);
  if (!match) return next();
  const user_turn = match?.question;
  if (user_turn?.to?.id !== ctx.from.id) {
    ctx.reply("هنوز نوبتت نشده دوست من");
    return next();
  }

  ctx.session.player.truthOrDare.truth = false;
  ctx.session.player.truthOrDare.dare = true;
  ctx.reply(
    `تو خیلی شجاعی دوست من منتظر باش که ${match.question.from.first_name} بهت بگه چیکار کنی`,
    {
      reply_markup: {
        keyboard: multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  await selectTruthOrDare(ctx.from.id, null, true);
  const otherPlayers = match.players.filter(
    (item) =>
      item.user_id !== user_turn?.from?.id && item.user_id !== user_turn?.to?.id
  );
  send(
    user_turn.from.id,
    `${user_turn.to.first_name}
شجاعت رو انتخاب کرد حالا چه کاری باید انجام بده؟`,
    multiplayerMatchKeyboard.keyboard
  );
  general?.disableAllProcessPlayer(user_turn.to.id, storage);
  general?.disableAllProcessPlayer(user_turn.from.id, storage);
  otherPlayers.map((item) => {
    send(
      item.user_id,
      `خیلی خب دوست شجاعتون ${user_turn.to.first_name} شجاعت رو انتخاب کرد حالا باید ببینیم که ${user_turn.from.first_name} بهش بگه چه کاری انجام بده.`
    );
  });
});

bot.hears("حقیقت👻", async (ctx) => {
  let match = await findMatch(ctx.from.id);
  if (!match) return next();
  const user_turn = match?.question;
  if (user_turn?.to?.id !== ctx.from.id) {
    ctx.reply("هنوز نوبتت نشده دوست من");
    return next();
  }
  ctx.session.player.truthOrDare.truth = false;
  ctx.session.player.truthOrDare.dare = true;
  ctx.reply(
    `دوست من منتظر باش که ${match.question.from.first_name} بهت بگه چیکار کنی`,
    {
      reply_markup: {
        keyboard: multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  // let user = storage.read(user_turn.from.id + "");
  // storage.write(user_turn.from.id);

  await selectTruthOrDare(ctx.from.id, null, true);
  const otherPlayers = match.players.filter(
    (item) =>
      item.user_id !== user_turn?.from?.id && item.user_id !== user_turn?.to?.id
  );
  send(
    user_turn.from.id,
    `${user_turn.to.first_name}
حقیقت رو انتخاب کرد حالا چه کاری باید انجام بده؟`
  );
  otherPlayers.map((item) => {
    send(
      item.user_id,
      `خیلی خب دوستتون ${user_turn.to.first_name} حقیقت رو انتخاب کرد حالا منتظر ${user_turn.from.first_name} میمونیم تا ببینیم صحبتش چی هست`
    );
  });
});

const handleReportPlayer = async (ctx, next = () => {}) => {
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  let target_id = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
  let result = await checkUserReport(ctx.from.id, target_id);
  if (result?.prevReported) {
    ctx.reply("شما قبلا این بازیکن را گزارش داده اید");
    return next();
  }
  if (result?.not_found) {
    ctx.reply(`کاربر در بازی وجود ندارد`);
    return next();
  }
  const target = await bot.api.getChat(target_id);
  ctx.session.report_message = {
    ...target,
    user_id: target.id,
    hasTurn: match.question.from.id === ctx.from.id,
  };
  ctx.reply(
    `
متن گزارش را ارسال کنید
گزارش شما به گوش دیگر افراد بازی میرسد
اگر تعداد گزارش ها به تعداد اعضای این تیم بجز فرد گزارش شده برسد اون فرد گزارش شده از بازی فعلی حذف خواهد شد.
توجه: متن گزارش باید کمتر از 60 کارکتر باشد`,
    {
      reply_markup: {
        keyboard: reportKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
};

bot.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.includes("reportPlayer")) return next();
  handleReportPlayer(ctx, next);
  return next();
});

bot.hears("👥گفتگو با بازیکنان", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  ctx.session.chat.chat = true;
  ctx.session.process.players_chat = true;
  if (match.question.from.id === ctx.from.id) {
    ctx.session.chat.hasTurn = true;
  }
  ctx.reply(
    "هم اکنون می توانید با بازیکنان گفتگو کنید برای لغو انجام می توانید بر روی دکمه بازگشت بزنید",
    {
      reply_markup: {
        keyboard: new Keyboard().text("بازگشت").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("🗣گفتگو با بازیکن خاص", async (ctx) => {
  const match = await findMatch(ctx.from.id);
  let data = [];
  if (!match) return next();
  const players = match.players.filter((item) => item.user_id !== ctx.from.id);
  for (let i = 0; i < players.length; i++) {
    let u = await bot.api.getChat(players[i].user_id);
    data.push({
      text: `${u?.first_name?.trim() || "@" + u?.username}`,
      callback_data: `openPrivateChat ${u.id}`,
    });
  }
  let inlineKey = new InlineKeyboard().row(...data);
  ctx.reply("با کدوم بازیکن میخوای خصوصی صحبت کنی؟", {
    reply_markup: { inline_keyboard: inlineKey.inline_keyboard },
  });
  ctx.session.process.player_chat = true;
});

bot.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.includes("openPrivateChat")) return next();
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  let user_id = +ctx.callbackQuery.data.match(/[0-9]/g).join("");
  ctx.session.privateChat = {
    user_id,
    hasTurn: match.question.from.id === ctx.from.id,
  };
  let target = await bot.api.getChat(user_id);
  // ctx.session.process.player_chat = true
  ctx.reply(
    `
هم اکنون می توانید با ${target.first_name} گفتگو کنید 
برای لغو گفتگو بر روی بازگشت بزنید`,
    {
      reply_markup: {
        keyboard: new Keyboard().text("بازگشت").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("بپرس شجاعت یا حقیقت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (!match || match.player_numbers !== 2) return next();
  let turn = match.players[match.turn - 1];
  if (turn.user_id === ctx.from.id) {
    ctx.reply("ارسال شد منتظر جواب باش دوست من");
    ctx.session.player.sended = true;
    bot.api.sendMessage(
      match.players.filter((item) => item.user_id !== ctx.from.id)[0].user_id,
      "شجاعت یا حقیقت؟",
      {
        reply_markup: {
          keyboard: new Keyboard().text("شجاعت").row().text("حقیقت").keyboard,
          resize_keyboard: true,
        },
      }
    );
  } else {
    ctx.reply("دوست من, هنوز نوبتت نشده");
  }
  return next();
});

async function friendSelectMode(ctx, mode) {
  let result = await friendMatchselectTruthOrDare(ctx.from.id, mode);
  const title = mode === "dare" ? "شجاعت" : "حقیقت";
  if (result?.already_selected) {
    ctx.reply(
      "دوست من تو قبلا یک گزینه رو انتخاب کردی باید منتظر باشی که دوستت بهت بگه چیکار کنی"
    );
    return next();
  } else if (result?.not_found) {
    ctx.reply("بازی یافت نشد");
    return next();
  } else if (result?.not_turn) {
    ctx.reply("دوست من هنوز نوبتت نشده");
    return next();
  }

  const getTo = result.match.players
    .map((item) => {
      if (item.id === result.match.turn?.to?.id) {
        return item;
      }
    })
    .filter((item) => item)[0];

  ctx.reply(
    `${title} انتخاب شد منتظر باش دوستت ${
      mode === "dare" ? "بهت بگه چیکار کنی" : "ازت سوال بپرسه"
    }`,
    {
      reply_markup: {
        keyboard: getTo
          ? getTo?.isOwner
            ? newGameFriendshipKeyboard(
                result.match,
                result.match.mode,
                result.match.turn.from.id === ctx.from.id
              ).keyboard
            : newGameAdminKeyboard(result.match, getTo?.admin, result.mode)
                .keyboard
          : "",
        resize_keyboard: true,
      },
    }
  );
  bot.api.sendMessage(
    result.match.turn.from.id,
    `دوستت ${ctx.from.first_name} ${title} رو انتخاب کرد حالا ${
      mode === "dare" ? "می خوای چیکار کنه ؟" : "سوالتو ازش بپرس"
    }`
  );
  result.match.players.map((item) => {
    if (
      item.id === result.match.turn.from.id ||
      item.id === result.match.turn?.to?.id
    )
      return;
    bot.api.sendMessage(
      item.id,
      `بازیکن ${ctx.from.first_name} ${title} رو انتخاب کرد`
    );
  });
}

bot.hears("شجاعت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (!match) {
    try {
      friendSelectMode(ctx, "dare");
    } catch (e) {}
    return next();
  }
  // general?.disableAllProcessPlayer(qst.to.id, storage);
  // general?.disableAllProcessPlayer(qst.from.id, storage);
  ctx.session.player.truthOrDare.truth = false;
  ctx.session.player.truthOrDare.dare = true;
  let turn = match.players[match.turn - 1];
  if (turn.user_id !== ctx.from.id) {
    ctx.reply("تو خیلی شجاعی دوست من منتظر باش که بهت بگه چیکار کنی", {
      reply_markup: {
        keyboard: matchPlayingKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    let current_user = match.players.filter(
      (item) => item.user_id !== ctx.from.id
    )[0].user_id;
    await selectPlayerTurn(ctx.from.id, current_user, false);
    bot.api.sendMessage(
      current_user,
      "دوستت شجاعت رو انتخاب کرد حالا کاری که میخوای انجام بده رو بهش بگو",
      {
        reply_markup: {
          keyboard: matchPlayingKeyboard.keyboard,
          resize_keyboard: true,
        },
      }
    );

    let userSession = storage.read(current_user + "");
    userSession.player.prevent_touch = true;
    storage.write(current_user + "", userSession);
    await selectMatchSenderReceiver(current_user, ctx.from.id);
  } else {
    ctx.reply("دوست من, هنوز نوبتت نشده");
  }
  return next();
});

bot.hears("حقیقت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (!match) {
    try {
      friendSelectMode(ctx, "truth");
    } catch (e) {}
    return next();
  }
  ctx.session.player.truthOrDare.truth = true;
  ctx.session.player.truthOrDare.dare = false;
  let turn = match.players[match.turn - 1];
  if (turn.user_id !== ctx.from.id) {
    ctx.reply("منتظر باش ازت سوال بپرسه", {
      reply_markup: {
        keyboard: matchPlayingKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    let current_user = match.players.filter(
      (item) => item.user_id !== ctx.from.id
    )[0].user_id;
    await selectPlayerTurn(ctx.from.id, current_user, false);
    bot.api.sendMessage(
      current_user,
      "دوستت حقیقت رو انتخاب کرد حالا یه سوال ازش بپرس",
      {
        reply_markup: {
          keyboard: matchPlayingKeyboard.keyboard,
          resize_keyboard: true,
        },
      }
    );

    //! change sender session
    let userSession = storage.read(current_user + "");
    userSession.player.prevent_touch = true;
    storage.write(current_user + "", userSession);
    await selectMatchSenderReceiver(current_user, ctx.from.id);
  } else {
    ctx.reply("دوست من, هنوز نوبتت نشده");
  }
  return next();
});

bot.hears("گزارش بازیکن", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  if (!match || match.player_numbers !== 2 || ctx.session.player.prevent_touch)
    return next();
  ctx.session.player.report = true;
  ctx.reply(
    "علت گزارش علیه بازیکن را در قالب یک پیام بفرستید استفاده از الفاظ رکیک با مسدود کردن شما توسط ربات و نادیده گرفتن گزارش شما همراه خواهد بود",
    {
      reply_markup: {
        keyboard: reportKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("⚠️گزارش بازیکن", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  let data = [];
  if (!match) return next();
  const players = match.players.filter((item) => item.user_id !== ctx.from.id);
  for (let i = 0; i < players.length; i++) {
    let u = await bot.api.getChat(players[i].user_id);
    data.push({
      text: `${u?.first_name?.trim() || "@" + u?.username}`,
      callback_data: `reportPlayer ${u.id}`,
    });
  }
  let inlineKey = new InlineKeyboard().row(...data);
  ctx.reply("میخوای گزارش کدوم بازیکنو ثبت کنی دوست من؟", {
    reply_markup: { inline_keyboard: inlineKey.inline_keyboard },
  });
  ctx.session.process.report_player = true;
  return next();
});

bot.hears("❗️ گزارش بازی", (ctx, next) => {
  ctx.session.player.report = true;
  ctx.session.process.report_game = true;
  ctx.reply(
    "علت گزارش علیه بازیکن را در قالب یک پیام بفرستید استفاده از الفاظ رکیک با مسدود کردن شما توسط ربات و نادیده گرفتن گزارش شما همراه خواهد بود",
    {
      reply_markup: {
        keyboard: reportKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("📝جزئیات بازی", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  let players = [];
  for (let i = 0; i < match.players.length; i++) {
    const player = await bot.api.getChat(match.players[i].user_id);
    players.push(player.first_name);
  }
  ctx.reply(`
بازی ${match.player_numbers} نفره

بازیکنان موجود ${match.players.length} نفر

بازیکنان: 
${players.join("\n\n")}`);
});

bot.hears("ثبت گزارش", async (ctx, next) => {
  if (Object.keys(ctx.session.report_message).length > 0) {
    const report_message = ctx.session.report_message;
    // console.log(report_message);
    let result = await checkUserReport(
      ctx.from.id,
      report_message.user_id,
      report_message.message,
      "finally"
    );
    // console.log(result);
    if (result?.remove_user) {
      bot.api.sendMessage(
        ctx.session.report_message.user_id,
        `
گزارش ها علیه شما به بیشترین حد خود رسید و شما از بازی فعلی حذف شدید`,
        {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        }
      );
      result.users.map((item) => {
        bot.api.sendMessage(
          item,
          `
بازیکن ${ctx.from.first_name} علیه بازیکن ${report_message.first_name} گزارش ثبت کرد.

علت گزارش: ${report_message.message}

بازیکن از بازی حذف شد`
        );
      });
    } else if (result?.report) {
      bot.api.sendMessage(
        ctx.session.report_message.user_id,
        `
کاربر ${ctx.from.first_name} علیه شما گزارش ثبت کرد

علت گزارش: ${report_message.message}`
      );
      result.users.map((item) => {
        bot.api.sendMessage(
          item,
          `
بازیکن ${ctx.from.first_name} علیه بازیکن ${report_message.first_name} گزارش ثبت کرد.

علت گزارش: ${report_message.message}`
        );
      });
    }
    ctx.reply(
      `گزارش ثبت شد ${
        result?.finished_game ? "بازی به اتمام رسید" : "به منوی بازی برگشتید"
      }`,
      {
        reply_markup: {
          keyboard: result?.finished_game
            ? mainKeyboard.keyboard
            : ctx.session.report_message.hasTurn
            ? multiplayerMatchCurrentUserKeyboard.keyboard
            : multiplayerMatchKeyboard.keyboard,
          resize_keyboard: true,
        },
      }
    );
    ctx.session.report_message = {};
    return next();
  }
  try {
    let result = await general.duoAcceptSendReportPlayer(ctx);
    if (!result && ctx.session.player.report_message?.message?.length === 0) {
      ctx.reply("متن گزارش نباید خالی باشد. شما به منوی بازی برگشتید", {
        reply_markup: {
          keyboard: matchPlayingKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
      return next();
    }
    ctx.reply("گزارش ثبت شد و بازی را به اتمام رساندید به منوی اصلی برگشتید", {
      reply_markup: {
        keyboard: mainKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
  } catch (e) {
    console.log(e);
  }
  return next();
});

bot.hears("لغو گزارش", (ctx, next) => {
  if (Object.keys(ctx.session.report_message).length > 0) {
    ctx.session.process.report_player = false;
    ctx.reply("گزارش لغو شد به منوی بازی برگشتید", {
      reply_markup: {
        keyboard: ctx.session.report_message.hasTurn
          ? multiplayerMatchCurrentUserKeyboard.keyboard
          : multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    return next() 
  }
  ctx.session.player.report = false;
  ctx.session.player.report_message = {};
  ctx.reply("گزارش لغو شد به منوی بازی برگشتید", {
    reply_markup: {
      keyboard: matchPlayingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("خروج از بازی", async (ctx, next) => {
  const friendMatch = await findFriendMatch(ctx.from.id);
  if (friendMatch) return next();
  ctx.session.player.leave_game = true;
  ctx.reply(
    `آیا اطمینان دارید؟
اگر از بازی خارج شوید بازیکن مقابل می تواند برای شما گزارش رد کند یا شما را مسدود کند که در صورت مشاهده ده اخطار شما اجازه استفاده از ربات را ندارید `,
    {
      reply_markup: {
        keyboard: new Keyboard()
          .text("بله می خواهم خارج شوم")
          .row()
          .text("خیر می خواهم ادامه دهم").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("درخواست اتمام", async (ctx, next) => {
  const friendMatch = await findFriendMatch(ctx.from.id);
  if (!friendMatch) return next();
  let result = await requestToFinish(ctx.from.id);
  if (result?.request) {
    let requests = [];
    for (let i in result.match.request_finish) {
      let user = await bot.api.getChat(result.match.request_finish[i]);
      requests.push(user.first_name);
    }
    ctx.reply(
      `درخواست اتمام بازی توسط شما با موفقیت ثبت شد
    
${
  result.match.request_finish.length > 0
    ? `
لیست بازیکنان درخواست های اتمام این بازی

${requests.join("\n")}
`
    : ""
}`,
      {
        reply_markup: {
          inline_keyboard: new InlineKeyboard().row({
            text: "لغو درخواست",
            callback_data: `cancel_request_finish ${ctx.from.id}`,
          }).inline_keyboard,
        },
      }
    );
    result.match.players.map((item) => {
      if (item.id !== ctx.from.id) {
        bot.api.sendMessage(
          item.id,
          `بازیکن ${ctx.from.first_name} درخواست اتمام بازی را ثبت کرد`
        );
      }
    });
  } else if (result?.matchDeleted) {
    result.matchDeleted.players.map(async (item) => {
      await bot.api.sendMessage(
        item.id,
        `بازی به اتمام رسید به منوی اصلی بازگشتید`,
        {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        }
      );
      const finishGameInlineKeyboard = await finishGameKeyboard(
        result?.match?.players || result?.matchDeleted?.players,
        item.id
      );
      bot.api.sendMessage(item.id, `لیست بازیکنان بازی قبلی`, {
        reply_markup: {
          inline_keyboard: finishGameInlineKeyboard.inline_keyboard,
        },
      });
    });
  }
  return next();
});

bot.on("callback_query:data", (ctx, next) => {
  if (!ctx.callbackQuery.data.includes("cancel_request_finish")) return next();
  const result = cancelRequestToFinish(ctx.from.id);
  if (result === false) return next();
  if (result?.already_selected) {
    ctx.answerCallbackQuery({
      text: `شما قبلا درخواست اتمام بازی را لغو کردید`,
    });
  } else if (result?.cancel) {
    ctx.answerCallbackQuery({
      text: "درخواست اتمام بازی با موفقیت لغو شد",
    });
    result?.match?.players.map((item) => {
      if (item.id !== ctx.from.id) {
        bot.api.sendMessage(
          item.id,
          `بازیکن ${ctx.from.id} درخواست اتمام بازی را لغو کرد`
        );
      }
    });
  }
  try {
    ctx.deleteMessage();
  } catch (e) {}
  return next();
});

bot.hears("بله می خواهم خارج شوم", async (ctx, next) => {
  if (!ctx.session.player.leave_game) return next();
  const match = await findMatch(ctx.from.id);
  if (!match) {
    let result = await leaveFriendGame(ctx.from.id);
    if (result?.not_exist) return next();
    if (result?.matchDeleted) {
      result.matchDeleted.players.map((item) => {
        bot.api.sendMessage(
          item.id,
          `بازی به اتمام رسید به منوی اصلی بازگشتید`,
          {
            reply_markup: {
              keyboard: mainKeyboard.keyboard,
              resize_keyboard: true,
            },
          }
        );
        try {
          let session_user = storage.read(item.id + "");
          session_user = defaultSession;
          storage.write(item.id + "", session_user);
        } catch (e) {}
      });
      return next();
    }
    let { matchResult, user_turn } = result;
    matchResult.players.map((item) => {
      bot.api.sendMessage(
        item.id,
        `بازیکن ${ctx.from.first_name} از بازی خارج شد`
      );
    });
    ctx.reply("از بازی خارج شدی و به منوی اصلی بازگشتی دوست من", {
      reply_markup: {
        keyboard: mainKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    return next();
  }

  if (match.player_numbers === 2) {
    general.leaveGame(ctx);
  } else {
    general.leaveMultipleGame(ctx);
  }

  ctx.reply("از بازی خارج شدی و به منوی اصلی بازگشتی دوست من", {
    reply_markup: {
      keyboard: mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });

  ctx.session.player.leave_game = false;
  return next();
});

bot.hears("خیر می خواهم ادامه دهم", async (ctx, next) => {
  if (!ctx.session.player.leave_game) return next();
  ctx.session.player.leave_game = false;
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  if (match?.player_numbers === 2) {
    ctx.reply("خوشحالم که می خوای بازی رو ادامه بدی دوست من", {
      reply_markup: {
        keyboard: matchPlayingKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
  } else {
    ctx.reply("خوشحالم که می خوای بازی رو ادامه بدی دوست من", {
      reply_markup: {
        keyboard:
          match.question.from.id === ctx.from.id
            ? multiplayerMatchCurrentUserKeyboard.keyboard
            : multiplayerMatchKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
  }
  return next();
});

bot.hears("گفتگو با بازیکن", async (ctx, next) => {
  const match = await findMatch(ctx.from.id);
  if (!match || match.player_numbers !== 2 || ctx.session.player?.prevent_touch)
    return next();
  ctx.session.player.chat = true;
  ctx.reply(
    `می توانید با بازیکن مقابل چت کنید هر زمان خواستید به منوی اصلی برگردید لطفا روی لغو گفتگو بزنید`,
    {
      reply_markup: {
        keyboard: new Keyboard().text("لغو گفتگو").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

//? private chat between - multiplayer-match

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (!data.includes("chatBetweenTwo")) return next();
  const match = await findMatch(ctx.from.id);
  if (!match) return next();
  const target_id = +data.match(/[0-9]/g).join("");
  const target = await bot.api.getChat(target_id);
  ctx.session.privateChat = {
    user_id: target_id,
    hasTurn: match.question.from.id === ctx.from.id,
  };
  ctx.session.process.player_chat = true;
  ctx.reply(
    `
هم اکنون می توانید با ${target.first_name} گفتگو کنید 
برای لغو گفتگو بر روی بازگشت بزنید`,
    {
      reply_markup: {
        keyboard: new Keyboard().text("بازگشت").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("لغو گفتگو", (ctx, next) => {
  ctx.session.player.chat = false;
  ctx.reply(`گفتگو با بازیکن لغو شد به منوی بازی برگشتید`, {
    reply_markup: {
      keyboard: matchPlayingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("آقا", async (ctx, next) => {
  if (ctx.session.selectTargetGender) {
    new DuoPlay(ctx).handleStartQueue(ctx, 2, "آقا");
    return next();
  }
  if (!ctx.session.selectGender) return next();
  selectGenderUser(ctx.from.id, "آقا");
  ctx.reply(`جنسیت انتخاب شده : آقا`, {
    reply_markup: {
      keyboard: settingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  ctx.session.selectGender = false;
  return next();
});

bot.hears("خانم", async (ctx, next) => {
  if (ctx.session.selectTargetGender) {
    new DuoPlay(ctx).handleStartQueue(ctx, 2, "خانم");
    return next();
  }
  if (!ctx.session.selectGender) return next();
  selectGenderUser(ctx.from.id, "خانم");
  ctx.reply(`جنسیت انتخاب شده : خانم`, {
    reply_markup: {
      keyboard: settingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  ctx.session.selectGender = false;
  return next();
});

bot.hears("تنظیمات", (ctx, next) => {
  if (ctx.session.player.prevent_touch) return next();
  ctx.reply(`دستورت چیه دوست من`, {
    reply_markup: {
      keyboard: settingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("بازی دوستانه", (ctx, next) => {
  if (ctx.session.player.prevent_touch) return next();
  ctx.session.select = "friendship";
  ctx.reply(
    `
دستورت چیه دوست من`,
    {
      reply_markup: {
        keyboard: mainFriendshipKeyboard.keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("افزودن دوست➕", (ctx, next) => {
  ctx.reply(`
سلام دوست من 
دوست داری باهمدیگه شجاعت حقیقت بازی کنیم؟ 
دوست داری آنلاین دونفره و تیمی چند نفره بازی کنی؟
دوست داری گروهی یا با دوستات بازی کنی؟

من تو رو به بازی شجاعت یا حقیقت دعوت میکنم
این لینک ربات رو استارت بزن که جزوی از دوستان من هم توی این ربات باشی

t.me/jorathaqiqatonline_bot?start=${ctx.from.id}`);
  return next();
});

bot.hears("🚷ترک بازی", (ctx, next) => {
  ctx.session.player.leave_game = true;
  ctx.reply(
    `آیا اطمینان دارید؟
اگر از بازی خارج شوید بازیکن مقابل می تواند برای شما گزارش رد کند یا شما را مسدود کند که در صورت مشاهده ده اخطار شما اجازه استفاده از ربات را ندارید `,
    {
      reply_markup: {
        keyboard: new Keyboard()
          .text("بله می خواهم خارج شوم")
          .row()
          .text("خیر می خواهم ادامه دهم").keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

//* select player number

let counts = ["2", "5", "10"];

for (let i in counts) {
  bot.hears(`${counts[i]} نفره`, async (ctx, next) => {
    let res = await general.findMatchExist(ctx);
    if (res?.isTrue) {
      ctx.reply(
        "درحال حاظر شما در یک بازی شرکت کرده اید اگر نمی توانید به منوی بازی برگردید بر روی /comeback یک بار بزنید"
      );
      return next();
    }
    try {
      let count = +ctx.message.text.match(/[0-9]/g)?.[0] ?? 0;
      if (count === 2) {
        ctx.session.selectTargetGender = true;
        ctx.reply(`دوست داری طرف مقابلت خانم باشه یا آقا؟`, {
          reply_markup: {
            keyboard: selectGender.keyboard,
            resize_keyboard: true,
          },
        });
      } else if (count === 5 || count === 10) {
        ctx.reply("چند ثانیه صبر کن دارم برات تیم جمع می کنم دوست من");
        new Multiplayer().handleStartQueue(ctx, count);
      }
    } catch (e) {
      console.log(e);
    }
    return next();
  });
}

bot.on("callback_query:data", (ctx, next) => {
  general.callbackQueryData(ctx);
  return next();
});

bot.command("comeback", async (ctx, next) => {
  const match = await findFriendMatch(ctx.from.id);
  ctx.session = defaultSession;
  if (!match) {
    const match = await findMatch(ctx.from.id);
    if (!match) {
      //!...group match and other
      return next();
    }
    ctx.reply("به منوی بازی برگشتی", {
      reply_markup: {
        keyboard: matchPlayingKeyboard.keyboard,
        resize_keyboard: true,
      },
    });
    return next();
  }
  const isMe = match.turn.from.id === ctx.from.id;
  const userMatchIndex = match.players.findIndex(
    (item) => item.id === ctx.from.id
  );
  ctx.reply("به منوی بازی برگشتی", {
    reply_markup: {
      keyboard:
        +match.owner === ctx.from.id
          ? newGameFriendshipKeyboard(match, match.mode, isMe).keyboard
          : newGameAdminKeyboard(
              match,
              match.players[userMatchIndex].admin,
              match.mode
            ).keyboard,
      resize_keyboard: true,
    },
  });

  return next();
});

bot.on("message", async (ctx, next) => {
  new DuoPlay().truthOrDareMessage(ctx, storage);
  mtp.multipleReport(ctx);
  general.chat(ctx);
  mtp.chatPlayers(ctx);
  mtp.privateChat(ctx);
  general.duoReporPlayer(ctx);
  mtp.playerSelectedTruthOrDare(ctx, storage);
  return next();
});

bot.start();
