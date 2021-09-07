const { session, Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("./config/require");
const mainKeyboard = require("./keyboard/main-keyboard");
const {
  matchKeyboard,
  matchPlayingKeyboard,
} = require("./keyboard/match-keyboard");
const playerCountKeyboard = require("./keyboard/playerCount-keyboard");
const selectGender = require("./keyboard/select-gender");
const settingKeyboard = require("./keyboard/setting_keyboard");
const { findMatch } = require("./model/match-model");
const { startQueue, findAndNewMatch } = require("./model/queue-model");
const {
  newuser,
  viewUserSetting,
  visibleUserProfile,
  selectGenderUser,
} = require("./model/user-model");

bot.use(
  session({
    initial() {
      return {
        select: undefined,
        waitForAddFriend: false,
        selectGender: false,
        selectTargetGender: false,
        findPlayer: false,
      };
    },
  })
);

bot.command("start", (ctx) => {
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
});

bot.hears("بازی آنلاین", (ctx) => {
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
});

bot.hears("افزودن دوست", (ctx) => {
  ctx.session.waitForAddFriend = true;
  ctx.reply(
    `خیلی خب دوست من
آیدی بازیکن یا یوزرنیم اون خوشبختت رو برام بفرست تا به لیست دوستات اضافش کنم`
  );
});

bot.hears("بازگشت", (ctx) => {
  ctx.reply(`دستورت چیه دوست من`, {
    reply_markup: {
      keyboard: ctx.session.selectGender
        ? settingKeyboard.keyboard
        : mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
  ctx.session.selectGender = false;
});

bot.hears("مشاهده تنظیمات فعلی", async (ctx) => {
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
});

bot.hears("نمایش پروفایل برای بازیکنان", async (ctx) => {
  let visibleProfileEnabled = await visibleUserProfile(ctx.from.id);
  ctx.reply(
    `نمایش پروفایل شما برای دیگر بازیکنان ${
      visibleProfileEnabled ? "غیر فعال" : "فعال"
    } شد`
  );
});

bot.hears("انتخاب جنسیت", async (ctx) => {
  ctx.session.selectGender = true;
  ctx.reply(`انتخاب کن دوست من`, {
    reply_markup: {
      keyboard: selectGender.keyboard,
      resize_keyboard: true,
    },
  });
});
let queue;
const handleStartQueue = async (ctx, multiplayer = 2, sex) => {
  ctx.session.findPlayer = true;
  const data = {
    multiplayer,
    user_id: ctx.from.id,
    date: Date.now(),
    sex,
    target_finded: undefined,
  };
  let start = await startQueue(data);
  if (start) {
    await ctx.reply("درحال یافتن بازیکن...", {
      reply_markup: {
        keyboard: new Keyboard().text("بازگشت").keyboard,
        resize_keyboard: true,
      },
    });
    function ChangeFindPlayer() {
      ctx.session.findPlayer = false;
      console.log("inside change" + ctx.session.findPlayer);
    }
    queue = setInterval(() => newMatchUser(ctx), 8000);
    async function newMatchUser(ctx) {
      if (ctx.session.findPlayer === false) {
        return clearInterval(queue);
      }
      let res = await findAndNewMatch(ctx.from.id, multiplayer, sex);
      console.log(res?.new_match_data);
      if (
        res?.new_match_data?.players.filter(
          (item) => item.user_id === ctx.from.id
        ).length > 0
      ) {
        ctx.reply("بازیکن یافت شد اول اون بازیو شروع میکنه دوست من", {
          reply_markup: {
            keyboard: matchKeyboard.keyboard,
            resize_keyboard: true,
          },
        });
        bot.api.sendMessage(
          res.target_user_id,
          `بازیکن یافت شد دوست من اول تو بازی رو شروع کن`,
          {
            reply_markup: {
              keyboard: matchPlayingKeyboard.keyboard,
              resize_keyboard: true,
            },
          }
        );
        ctx.session.findPlayer = false;
        console.log(ctx.session);
        ChangeFindPlayer();
        clearInterval(queue);
      }
    }
  } else ctx.reply("خطایی رخ داده لطفا کمی بعد دوباره امتحان کنید");
};

bot.hears("بپرس شجاعت یا حقیقت", (ctx) => {
  let match = findMatch(ctx.from.id);
  if (match) {
    let turn = match.players[match.turn - 1];
    if (turn.user_id === ctx.from.id) {
      ctx.reply("ارسال شد منتظر جواب باش دوست من");
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
});

bot.hears("شجاعت", (ctx) => {
  let match = findMatch(ctx.from.id);
  if (match) {
    let turn = match.players[match.turn - 1];
    if (turn.user_id !== ctx.from.id) {
      ctx.reply("تو خیلی شجاعی دوست من منتظر باش که بهت بگه چیکار کنی", {
        reply_markup: {
          keyboard: matchPlayingKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
      bot.api.sendMessage(
        match.players.filter((item) => item.user_id !== ctx.from.id)[0].user_id,
        "دوستت شجاعت رو انتخاب کرد حالا کاری که میخوای انجام بده رو بهش بگو",
        {
          reply_markup: {
            keyboard: matchPlayingKeyboard.keyboard,
            resize_keyboard: true,
          },
        }
      );
    } else {
      ctx.reply("دوست من, هنوز نوبتت نشده");
    }
  }
});

bot.hears("گزارش بازیکن", (ctx) => {
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
});

bot.hears("ثبت گزارش", (ctx) => {
  ctx.reply("گزارش ثبت شد و بازی را به اتمام رساندید به منوی اصلی برگشتید", {
    reply_markup: {
      keyboard: mainKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
});

bot.hears("لغو گزارش", (ctx) => {
  ctx.reply("گزارش لغو شد به منوی بازی برگشتید", {
    reply_markup: {
      keyboard: matchPlayingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
});

bot.hears("خروج از بازی", (ctx) => {
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
});

bot.hears("گفتگو با بازیکن", (ctx) => {
  ctx.reply(
    `می توانید با بازیکن مقابل چت کنید هر زمان خواستید به منوی اصلی برگردید لطفا روی لغو گفتگو بزنید`,
    {
      reply_markup: {
        keyboard: new Keyboard().text("لغو گفتگو").keyboard,
        resize_keyboard: true,
      },
    }
  );
});

bot.hears("لغو گفتگو", (ctx) => {
  ctx.reply(`گفتگو با بازیکن لغو شد به منوی بازی برگشتید`, {
    reply_markup: {
      keyboard: matchPlayingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
});

bot.hears("حقیقت", (ctx) => {
  let match = findMatch(ctx.from.id);
  if (match) {
    let turn = match.players[match.turn - 1];
    if (turn.user_id !== ctx.from.id) {
      ctx.reply("منتظر باش ازت سوال بپرسه", {
        reply_markup: {
          keyboard: matchPlayingKeyboard.keyboard,
          resize_keyboard: true,
        },
      });
      bot.api.sendMessage(
        match.players.filter((item) => item.user_id !== ctx.from.id)[0].user_id,
        "دوستت حقیقت رو انتخاب کرد حالا یه سوال ازش بپرس",
        {
          reply_markup: {
            keyboard: matchPlayingKeyboard.keyboard,
            resize_keyboard: true,
          },
        }
      );
    } else {
      ctx.reply("دوست من, هنوز نوبتت نشده");
    }
  }
});

bot.hears("آقا", async (ctx) => {
  if (ctx.session.selectTargetGender) {
    handleStartQueue(ctx, 2, "آقا");
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
});

bot.hears("خانم", async (ctx) => {
  if (ctx.session.selectTargetGender) {
    handleStartQueue(ctx, 2, "خانم");
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
});

bot.hears("تنظیمات", (ctx) => {
  ctx.reply(`دستورت چیه دوست من`, {
    reply_markup: {
      keyboard: settingKeyboard.keyboard,
      resize_keyboard: true,
    },
  });
});

bot.hears("بازی دوستانه", (ctx) => {
  ctx.session.select = "friendship";
  //     ctx.reply(`آیدی یا یوزرنیم تمام دوستاتو توی یه قالب یه پیام برام بفرست
  //   می تونی برای دوستای فعلیت دعوت نامه بفرستی`,{
  //       reply_markup: {
  //           inline_keyboard:
  //       }
  //   });
});

bot.hears(/[نفره]/g, (ctx) => {
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
    }
  } catch (e) {}
});

bot.start();
