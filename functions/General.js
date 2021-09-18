const { InlineKeyboard } = require("grammy");
const bot = require("../config/require");
const mainKeyboard = require("../keyboard/main-keyboard");
const {
  findMatch,
  hiddenMesssagePlayer,
  showMesssagePlayer,
  deleteMatch,
  exitMatch,
  changeTurnNextPlayer,
} = require("../model/match-model");
const { addReport } = require("../model/user-model");
const { send, reply } = require("./msg");

class General {
  async chat(ctx) {
    if (
      !ctx.session.player.chat ||
      ctx.message.text.includes("گفتگو با بازیکن")
    )
      return;
    let user_id_players = await findMatch(ctx.from.id);
    user_id_players = user_id_players.players
      ?.map((item) => {
        if (item.user_id !== ctx.from.id) {
          return { user_id: item.user_id, hiddenMessages: item.hiddenMessages };
        }
      })
      .filter((item) => item);
    user_id_players.map((item) => {
      if (!item?.hiddenMessages?.includes(ctx.from.id)) {
        bot.api.sendMessage(
          item.user_id,
          `
    یک پیام از طرف: ${ctx.from?.first_name.trim() || "ناشناس"}
    
    ${ctx.message.text}
    `,
          {
            reply_markup: {
              inline_keyboard: new InlineKeyboard()
                .text("پیامهاش رو نمایش نده", `hiddenMessages ${ctx.from.id}`)
                .row()
                .text("پیامهاش رو نمایش بده", `showMessages ${ctx.from.id}`)
                .inline_keyboard,
              resize_keyboard: true,
            },
          }
        );
      }
    });
    bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
      text: "پیام شما به تمام بازیکنان ارسال شد",
    });
  }

  async callbackQueryData(ctx) {
    let data = ctx.callbackQuery.data;
    if (!data.includes("hiddenMessages") && !data.includes("showMessages"))
      return;
    let match = await findMatch(ctx.from.id);
    if (!match) {
      bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        text: "شما هنوز بازی شروع نکردید",
      });
      return;
    }
    if (data.includes("hiddenMessages")) {
      let result = await hiddenMesssagePlayer(
        ctx.from.id,
        +data.match(/[0-9]/g).join("")
      );
      if (result?.alreadyHided) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "قبلا مخفی کردن پیام های این بازیکن را اعمال کردید",
        });
      } else if (result?.hided) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "پیام های این بازیکن دیگر برای شما نمایش داده نمی شوند",
        });
      }
    } else if (data.includes("showMessages")) {
      let result = await showMesssagePlayer(
        ctx.from.id,
        +data.match(/[0-9]/g).join("")
      );
      if (result?.alreadyShow) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "قبلا نمایش پیام های این بازیکن را اعمال کردی",
        });
      } else if (result?.showing) {
        bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: "پیام های این بازیکن برای شما نمایش داده می شوند",
        });
      }
    }
  }
  async duoReporPlayer(ctx) {
    if (
      ctx.session.player.report &&
      !ctx.message.text.includes("گزارش بازیکن")
    ) {
      ctx.session.player.report_message = {
        user_id: ctx.from.id,
        message: ctx.message.text,
      };
      ctx.reply(`گزارش شما انجام شد برای ثبت لطفا روی دکمه ی ثبت گزارش بزنید.
      
متن گزارش: ${ctx.message.text}`);
    }
  }
  async duoAcceptSendReportPlayer(ctx) {
    if (
      ctx.session.player.report &&
      Object.keys(ctx.session.player.report_message).length > 0
    ) {
      let match = await findMatch(ctx.from.id);
      let user = match.filter((item) => item.user_id !== ctx.from.id)[0];
      let result = await addReport(
        user.user_id,
        ctx.session.player.report_message
      );
      if (result?.alreadyReported) {
        ctx.reply("کاربر قبلا مسدود شده");
        return;
      } else if (result.report) {
        await deleteMatch(ctx.from.id);
        ctx.reply("کاربر مسدود شد و بازی را به اتمام رساندید دوست من", {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        });
        bot.api.sendMessage(
          user.user_id,
          `
بازیکن مقابل شما را مسدود کرد و بازی را به اتمام رساند.

علت مسدود شدن: ${ctx.session.players.report_message.message}
`,
          {
            reply_markup: {
              keyboard: mainKeyboard.keyboard,
              resize_keyboard: true,
            },
          }
        );
      }
      ctx.session.player.report = false;
      ctx.session.player.report_message = {};
    }
  }
  async leaveGame(ctx) {
    if (
      ctx.session.player.leave_game &&
      ctx.message.text === "بله می خواهم خارج شوم"
    ) {
      let current_match = await findMatch(ctx.from.id);
      let users = current_match.players.filter(
        (item) => item.user_id !== ctx.from.id
      );
      if (!current_match) {
        ctx.reply("شما هنوز در بازی نیستی.");
        return;
      }
      let result = await exitMatch(ctx.from.id);
      if (result?.delete) {
        ctx.reply("شما از بازی خارج شدید و بازی به اتمام رسید", {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        });
        bot.api.sendMessage(
          users[0].user_id,
          `
بازیکن مقابل از بازی خارج شد و بازی به اتمام رسید
  `,
          {
            reply_markup: {
              keyboard: mainKeyboard.keyboard,
              resize_keyboard: true,
            },
          }
        );
      } else if (result?.leave) {
        ctx.reply("شما از بازی خارج شدید", {
          reply_markup: {
            keyboard: mainKeyboard.keyboard,
            resize_keyboard: true,
          },
        });
        users.map((user) => {
          bot.api.sendMessage(
            user.user_id,
            `
یکی از بازیکنان از بازی خارج شد
          `
          );
        });
      }
      ctx.session.player.leave_game = false;
    }
  }

  async leaveMultipleGame(ctx) {
    const match = await findMatch(ctx.from.id);
    if (!match) return;
    const qst = match.question;
    const players = match.players;

    if (players.length <= 2) {
      await deleteMatch(ctx.from.id);
      match.players.map((item) => {
        if (item.user_id !== ctx.from.id) {
          bot.api.sendMessage(
            item.user_id,
            `
  بازیکن ${ctx.from.first_name} از بازی خارج شد و این بازی به اتمام رسید`,
            {
              reply_markup: {
                keyboard: mainKeyboard.keyboard,
                resize_keyboard: true,
              },
            }
          );
        }
      });
      return;
    }

    if (qst.from.id === ctx.from.id || qst.to.id === ctx.from.id) {
      changeTurnNextPlayer(ctx.from.id);
    }
    match.players.map((item) => {
      if (item.user_id !== ctx.from.id) {
        bot.api.sendMessage(
          item.user_id,
          `
بازیکن ${ctx.from.first_name} از بازی خارج شد`
        );
      }
    });
  }

  disableAllProcess(ctx) {
    ctx.session.process.player_chat = false;
    ctx.session.process.players_chat = false;
    ctx.session.process.report_player = false;
    ctx.session.process.report_game = false;
    ctx.session.process.leave_game = false;
    ctx.session.selectGender = false;
  }

  async disableAllProcessPlayer(user_id, storage) {
    const match = await findMatch(user_id);
    if (!match) return;
    let question = match.question;
    let pss = {
      players_chat: false,
      player_chat: false,
      report_player: false,
      report_game: false,
      leave_game: false,
    };
    if (question.from.id === user_id) {
      let sessions = storage.read(question.from.id + "");
      if (sessions?.process) {
        sessions.process = pss;
        storage.write(question.from.id + "", sessions);
      }
    } else if (question.to.id === user_id) {
      let sessions = storage.read(question.to.id + "");
      if (sessions?.process) {
        sessions.process = pss;
        storage.write(question.to.id + "", sessions);
      }
    }
  }
}

module.exports = General;
