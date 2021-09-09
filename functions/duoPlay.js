const { Keyboard } = require("grammy");
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
  async truthOrDareMessage(ctx) {
    if (ctx.session.player.chat) return;
    let match = await findMatch(ctx.from.id);
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
      res.players.filter((item) => item.answer.length > 0).length ===
      res.players.length
    ) {
      await changeNextTurn(match.sender);
      await clearAnswers(ctx.from.id);
      await selectPlayerTurn(ctx.from.id, ctx.from.id, true);
      let res = await changeCapacity(ctx.from.id);
      if (res?.finished_game) {
        send(
          match.receiver,
          "بازی به اتمام رسید. بازی جدید رو شروع کن دوست من",
          mainKeyboard.keyboard
        );
        send(
          match.sender,
          "بازی به اتمام رسید. بازی جدید رو شروع کن دوست من",
          mainKeyboard.keyboard
        );
        return;
      }
      send(match.receiver, ctx.message.text);
      send(match.sender, "نوبت تو شد دوست من");
    } else {
      send(match.receiver, ctx.message.text);
    }
  }
}

module.exports = DuoPlay;
