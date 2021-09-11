const { session, Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("./config/require");
const DuoPlay = require("./functions/duoPlay");
const General = require("./functions/General");
const { reply, send } = require("./functions/msg");
const Multiplayer = require("./functions/Multiplayer");
const mainKeyboard = require("./keyboard/main-keyboard");
const { matchPlayingKeyboard } = require("./keyboard/match-keyboard");
const playerCountKeyboard = require("./keyboard/playerCount-keyboard");
const selectGender = require("./keyboard/select-gender");
const settingKeyboard = require("./keyboard/setting_keyboard");
const {
  findMatch,
  selectMatchSenderReceiver,
  changeNextTurn,
  setAnswer,
  clearAnswers,
  selectPlayerTurn,
} = require("./model/match-model");
const { startQueue, findAndNewMatch } = require("./model/queue-model");
const {
  newuser,
  viewUserSetting,
  visibleUserProfile,
  selectGenderUser,
} = require("./model/user-model");
const general = new General();

bot.use(
  session({
    initial() {
      return {
        select: undefined,
        waitForAddFriend: false,
        selectGender: false,
        waitForFindPlayer: false,
        selectTargetGender: false,
        findPlayer: false,
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

bot.command("start", (ctx, next) => {
  newuser({
    user_id: ctx.from.id,
    matchs: [],
    user_unique_id: customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8)(),
    sex: "unavailable",
    visible_profile: false,
  });
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

bot.hears("بازی آنلاین", (ctx, next) => {
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

bot.hears("بازگشت", (ctx, next) => {
  ctx.reply(`دستورت چیه دوست من`, {
    reply_markup: {
      keyboard: ctx.session.selectGender
        ? settingKeyboard.keyboard
        : mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  ctx.session.selectGender = false;
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

bot.hears("بپرس شجاعت یا حقیقت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (match) {
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
  }
  return next();
});

bot.hears("شجاعت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (match) {
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
      await selectMatchSenderReceiver(current_user, ctx.from.id);
    } else {
      ctx.reply("دوست من, هنوز نوبتت نشده");
    }
  }
  return next();
});

bot.hears("حقیقت", async (ctx, next) => {
  let match = await findMatch(ctx.from.id);
  if (match) {
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
      await selectMatchSenderReceiver(current_user, ctx.from.id);
    } else {
      ctx.reply("دوست من, هنوز نوبتت نشده");
    }
  }
  return next();
});

bot.hears("گزارش بازیکن", (ctx, next) => {
  ctx.session.player.report = true;
  ctx.reply(
    "علت گزارش علیه بازیکن را در قالب یک پیام بفرستید استفاده از الفاظ رکیک با مسدود کردن شما توسط ربات و نادیده گرفتن گزارش شما همراه خواهد بود",
    {
      reply_markup: {
        keyboard: new Keyboard().text("ثبت گزارش").row().text("لغو گزارش")
          .keyboard,
        resize_keyboard: true,
      },
    }
  );
  return next();
});

bot.hears("ثبت گزارش", (ctx, next) => {
  general.duoAcceptSendReportPlayer(ctx);
  ctx.reply("گزارش ثبت شد و بازی را به اتمام رساندید به منوی اصلی برگشتید", {
    reply_markup: {
      keyboard: mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("لغو گزارش", (ctx, next) => {
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

bot.hears("خروج از بازی", (ctx, next) => {
  ctx.session.player.leave_game = true;
  ctx.reply(
    `آیا اطمینان دارید؟
اگر از بازی خارج شوید بازیکن مقابل می تواند برای شما گزارش رد کند یا شما را مسدود کند که در صورت مشاهده ده اخطار شما اجازه استفاده ار ربات را ندارید `,
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

bot.hears("بله می خواهم خارج شوم", (ctx, next) => {
  general.leaveGame(ctx);
  ctx.reply("از بازی خارج شدی و به منوی اصلی بازگشتی دوست من", {
    reply_markup: {
      keyboard: mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("خیر می خواهم ادامه دهم", (ctx, next) => {
  ctx.session.player.leave_game = false;
  ctx.reply("خوشحالم که می خوای بازی رو ادامه بدی دوست من", {
    reply_markup: {
      keyboard: matchPlayingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("گفتگو با بازیکن", (ctx, next) => {
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
    return;
  }
  if (!ctx.session.selectGender) return;
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
    return;
  }
  if (!ctx.session.selectGender) return;
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
  ctx.reply(`دستورت چیه دوست من`, {
    reply_markup: {
      keyboard: settingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  return next();
});

bot.hears("بازی دوستانه", (ctx, next) => {
  ctx.session.select = "friendship";
  //     ctx.reply(`آیدی یا یوزرنیم تمام دوستاتو توی یه قالب یه پیام برام بفرست
  //   می تونی برای دوستای فعلیت دعوت نامه بفرستی`,{
  //       reply_markup: {
  //           inline_keyboard:
  //       }
  //   });
  return next();
});

bot.hears(/[نفره]/g, (ctx, next) => {
  //   if (!ctx.session.select) return;
  try {
    let count = +ctx.message.text.match(/[0-9]/g)[0];
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
  } catch (e) {}
  return next();
});

bot.on("callback_query:data", (ctx) => {
  general.callbackQueryData(ctx);
});

bot.on("message", async (ctx, next) => {
  new DuoPlay().truthOrDareMessage(ctx);
  general.chat(ctx);
  general.duoReporPlayer(ctx);
  return next();
});
bot.start();
