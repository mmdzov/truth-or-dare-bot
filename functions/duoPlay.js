const { Keyboard, InlineKeyboard } = require("grammy");
const mainKeyboard = require("../keyboard/main-keyboard");
const { matchPlayingKeyboard } = require("../keyboard/match-keyboard");
const {
  findMatch,
  selectMatchSenderReceiver,
  setAnswer,
  changeNextTurn,
  clearAnswers,
  selectPlayerTurn,
  detectPlayerTurn,
  changeCapacity,
} = require("../model/match-model");
const { startQueue, findAndNewMatch } = require("../model/queue-model");
const { reply, send } = require("./msg");
const user = require("../model/user-model");
const bot = require("../config/require");
const { addUserFriend } = require("../model/user-model");
class DuoPlay {
  constructor(ctx) {
    this.ctx = ctx;
    this.init();
  }
  async init() {
    this.match = await findMatch(this.ctx);
  }
  askTruthOrDare() {
    if (this.match) {
      let turn = this.match.players[this.match.turn - 1];
      if (turn.user_id === this.ctx.from.id) {
        reply(this.ctx, "ارسال شد منتظر جواب باش دوست من");
        bot.api.sendMessage(
          this.match.players.filter(
            (item) => item.user_id !== this.ctx.from.id
          )[0].user_id,
          "شجاعت یا حقیقت؟",
          {
            reply_markup: {
              keyboard: new Keyboard().text("شجاعت").row().text("حقیقت")
                .keyboard,
              resize_keyboard: true,
            },
          }
        );
      } else {
        reply(this.ctx, "دوست من, هنوز نوبتت نشده");
      }
    }
  }
  truthOrDare(mode = "") {
    if (this.match) {
      let turn = match.players[match.turn - 1];
      if (turn.user_id !== ctx.from.id) {
        if (mode === "dare") {
          reply(
            this.ctx,
            "تو خیلی شجاعی دوست من منتظر باش که بهت بگه چیکار کنی",
            matchPlayingKeyboard.keyboard
          );
          send(
            match.players.filter((item) => item.user_id !== ctx.from.id)[0]
              .user_id,
            "دوستت شجاعت رو انتخاب کرد حالا کاری که میخوای انجام بده رو بهش بگو",
            matchPlayingKeyboard.keyboard
          );
        } else {
          reply(
            this.ctx,
            "منتظر باش ازت سوال بپرسه",
            matchPlayingKeyboard.keyboard
          );
          send(
            match.players.filter((item) => item.user_id !== ctx.from.id)[0]
              .user_id,
            "دوستت حقیقت رو انتخاب کرد حالا یه سوال ازش بپرس",
            matchPlayingKeyboard.keyboard
          );
        }
      } else reply(this.ctx, "دوست من, هنوز نوبتت نشده");
    }
  }

  async handleStartQueue(ctx, multiplayer = 2, sex) {
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
      await reply(
        ctx,
        "درحال یافتن بازیکن...",
        new Keyboard().text("بازگشت").keyboard
      );
      function ChangeFindPlayer() {
        ctx.session.findPlayer = false;
      }
      let queue = setInterval(() => newMatchUser(ctx), 8000);
      async function newMatchUser() {
        if (ctx.session.findPlayer === false) {
          return clearInterval(queue);
        }
        let res = await findAndNewMatch(ctx.from.id, multiplayer, sex);
        if (
          res?.new_match_data?.players.filter(
            (item) => item.user_id === ctx.from.id
          ).length > 0
        ) {
          reply(
            ctx,
            "بازیکن یافت شد اول اون بازیو شروع میکنه دوست من",
            matchPlayingKeyboard.keyboard
          );
          send(
            res.target_user_id,
            `بازیکن یافت شد دوست من اول تو بازی رو شروع کن`,
            matchPlayingKeyboard.keyboard
          );
          ctx.session.findPlayer = false;
          ChangeFindPlayer();
          clearInterval(queue);
        }
      }
    } else reply(ctx, "خطایی رخ داده لطفا کمی بعد دوباره امتحان کنید");
  }
  async truthOrDareMessage(ctx, storage) {
    if (ctx.message.text.includes("لغو گفتگو") || ctx.session.player.chat)
      return;
    if (ctx.session.player?.prevent_touch) {
      const msg = ctx.message.text;
      if (
        msg.includes("بازی آنلاین") ||
        msg.includes("بازی دوستانه") ||
        msg.includes("تنظیمات") ||
        msg.includes("گزارش بازیکن") ||
        msg.includes("ثبت گزارش") ||
        msg.includes("لغو گزارش") ||
        msg.includes("گفتگو با بازیکن") ||
        msg.includes("بازگشت") ||
        msg.includes("خروج از بازی") ||
        msg.split("")[0] === "/" ||
        ctx.session.player?.report_message?.user_id?.length > 0
      ) {
        ctx.reply(
          "تا زمانی که نوبت شما هست نمی توانید از دکمه ها و دستورات استفاده کنید لطفا نوبت خود را بازی کنید"
        );
        return;
      }
      ctx.session.player.prevent_touch = false;
    }
    let match = await findMatch(ctx.from.id);
    if (!match?.sender) return; //? If it was not a two-player game, returned
    if (!match) return;
    let detect = await detectPlayerTurn(ctx.from.id, ctx.from.id);
    if (Object.keys(match)?.length > 0) {
      if (detect?.hasTurn && detect?.playerTurn && !ctx.session.player.sended) {
        reply(
          ctx,
          "باید از بازیکن مقابل بپرسی شجاعت یا حقیقت؟ روی دکمه ی مربوطه بزن اگه پرسیدی منتظر باش تا بازیکن مقابل انتخاب کنه دوست من"
        );
        return;
      } else if (ctx.session.player.sended) {
        ctx.session.player.sended = false;
      }
    } else return;
    let playerIndex = match.players.findIndex(
      (item) => item.user_id === ctx.from.id
    );
    if (
      ctx.message.text.includes("شجاعت") ||
      ctx.message.text.includes("حقیقت") ||
      ctx.message.text.includes("بپرس شجاعت یا حقیقت") ||
      !match
    )
      return;
    if (
      match.players[playerIndex]?.answer?.length > 0 ||
      match.sender !== ctx.from.id
    ) {
      ctx.reply("باید منتظر بازیکن مقابل باشی دوست من.");
      return;
    }

    selectMatchSenderReceiver(match.receiver, match.sender);
    let res = await setAnswer(ctx.from.id, ctx.message.text);
    if (
      res.players.filter((item) => item.answer && item.answer?.length > 0)
        ?.length === res.players.length
    ) {
      await changeNextTurn(match.sender);
      await clearAnswers(ctx.from.id);
      await selectPlayerTurn(ctx.from.id, ctx.from.id, true);
      let res = await changeCapacity(ctx.from.id);
      if (res?.finished_game) {
        const friends = await user.getUserFriends(match.sender);
        let hasFriend = friends.some((item) => item === match.receiver);
        if (!hasFriend) {
          bot.api.sendMessage(match.receiver, "بازی به اتمام رسید", {
            reply_markup: {
              inline_keyboard: new InlineKeyboard().row({
                text: "ارسال درخواست دوستی➕",
                callback_data: `request_to_add_friend ${match.sender}`,
              }).inline_keyboard,
            },
          });

          bot.api.sendMessage(match.sender, "بازی به اتمام رسید", {
            reply_markup: {
              inline_keyboard: new InlineKeyboard().row({
                text: "ارسال درخواست دوستی➕",
                callback_data: `request_to_add_friend ${match.receiver}`,
              }).inline_keyboard,
            },
          });
        }
        send(
          match.receiver,
          "به منوی اصلی برگشتی دوست من",
          mainKeyboard.keyboard
        );
        send(
          match.sender,
          "به منوی اصلی برگشتی دوست من",
          mainKeyboard.keyboard
        );
        return;
      }
      send(match.receiver, ctx.message.text);
      send(match.sender, "نوبت تو شد دوست من");
    } else {
      send(match.receiver, ctx.message.text);
      ctx.reply(
        "پیام شما برای بازیکن مقابل ارسال شد الان نوبت بازیکن مقابل هست که بازی کند"
      );
      let receiverUserStorage = storage.read(match.receiver + "");
      receiverUserStorage.player.prevent_touch = true;
      storage.write(match.receiver + "", receiverUserStorage);
    }
  }

  async sendRequestToAddFriend(ctx) {
    if (!ctx.callbackQuery.data.includes("request_to_add_friend")) return;
    const userId = +ctx.callbackQuery.data
      .split(" ")[1]
      .match(/[0-9]/g)
      .join("");
    const userChat = await bot.api.getChat(userId);
    const friends = await user.getUserFriends(ctx.from.id);
    if (friends.includes(userId)) {
      ctx.answerCallbackQuery({ text: "بازیکن اکنون دوست شماست" });
      ctx.deleteMessage();
      return;
    }
    let result = await user.sendRequest(ctx.from.id, userId);
    if (!result) {
      ctx.answerCallbackQuery({
        text: "شما یک بار درخواست دوستی فرستادید منتظر پاسخ بازیکن باشید",
      });
      return;
    }
    ctx.answerCallbackQuery({
      text: `درخواست دوستی به ${userChat.first_name} ارسال شد`,
    });
    bot.api.sendMessage(
      userId,
      `بازیکن ${userChat.first_name} یک درخواست دوستی برای شما ارسال کرد`,
      {
        reply_markup: {
          inline_keyboard: new InlineKeyboard().row(
            {
              text: "رد درخواست❌",
              callback_data: `reject_request_add_friend ${ctx.from.id} ${ctx.callbackQuery.message.message_id}`,
            },
            {
              text: "قبول درخواست✅",
              callback_data: `accept_request_add_friend ${ctx.from.id} ${ctx.callbackQuery.message.message_id}`,
            }
          ).inline_keyboard,
        },
      }
    );
  }

  async acceptRequestToAddFriend(ctx) {
    if (!ctx.callbackQuery.data.includes("accept_request_add_friend")) return;
    const userId = +ctx.callbackQuery.data
      .split(" ")[1]
      .match(/[0-9]/g)
      .join("");
    const messageId = +ctx.callbackQuery.data.split(" ")[2];
    let result = await user.acceptRequest(ctx.from.id, userId);
    const userChat = await bot.api.getChat(userId);
    if (result) {
      await ctx.answerCallbackQuery({
        text: `بازیکن ${userChat.first_name} به لیست دوستان شما اضاف شد`,
      });

      try {
        bot.api.deleteMessage(userId, messageId);
      } catch (e) {}

      bot.api.sendMessage(
        userId,
        `بازیکن ${ctx.from.first_name} درخواست دوستی شما را قبول کرد`
      );

      ctx.deleteMessage();

      return;
    }
    ctx.answerCallbackQuery({
      text: "در قبول کردن درخواست دوستی مشکلی پیش آمد",
    });
  }

  async rejectRequestToAddFriend(ctx) {
    if (!ctx.callbackQuery.data.includes("reject_request_add_friend")) return;
    const userId = +ctx.callbackQuery.data
      .split(" ")[1]
      .match(/[0-9]/g)
      .join("");
    const messageId = +ctx.callbackQuery.data.split(" ")[2];
    let result = await user.rejectRequest(ctx.from.id, userId);
    if (!result) {
      ctx.answerCallbackQuery({
        text: "در رد کردن درخواست دوستی مشکلی پیش آمد",
      });
      return;
    }
    await ctx.answerCallbackQuery({
      text: `درخواست دوستی لغو شد`,
    });

    try {
      bot.api.deleteMessage(userId, messageId);
    } catch (e) {}

    ctx.deleteMessage();

    bot.api.sendMessage(
      userId,
      `بازیکن ${ctx.from.first_name} درخواست دوستی شما را رد کرد`
    );
  }
}

module.exports = DuoPlay;
