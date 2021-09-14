const { Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("../config/require");
const {
  multiplayerMatchKeyboard,
  multiplayerMatchCurrentUserKeyboard,
  aboutMessageInlineKeyboard,
} = require("../keyboard/multiplayer-match-keyboard");
const {
  findMatch,
  disabledResendMessage,
  changeTurnNextPlayer,
  setMultipleMatchTurn,
} = require("../model/match-model");
const {
  startQueue,
  findAndNewMatch,
  findMultipleMatch,
} = require("../model/queue-model");
const queue = require("../schema/queue-schema");
const { reply, send, advanceSend } = require("./msg");

class Multiplayer {
  constructor() {}
  async handleStartQueue(ctx, multiplayer) {
    const mtp = 2;
    ctx.session.waitForFindPlayer = true;
    const data = {
      multiplayer: mtp, //! this is test but parameter is multiplayer
      user_id: ctx.from.id,
      date: Date.now(),
      matched: undefined,
      queue_unique_id: customAlphabet(
        "123456789asdfghjklzxcvbnmqwertyuiop",
        10
      )(),
    };
    let start = await startQueue(data);
    if (start) {
      await reply(
        ctx,
        "درحال یافتن بازیکن...",
        new Keyboard().text("بازگشت").keyboard
      );
      function ChangeFindPlayer() {
        ctx.session.waitForFindPlayer = false;
      }
      let queueInterval = setInterval(() => newMatchUser(ctx), 8000);
      async function newMatchUser() {
        if (ctx.session.waitForFindPlayer === false) {
          return clearInterval(queueInterval);
        }
        let result = await findMultipleMatch(ctx.from.id, mtp);
        if (result?.startMatch) {
          result.player_id_list.map((item) => {
            send(item, `تیم تکمیل شد و بازی شروع می شود.`);
          });
          let user_chat = await bot.api.getChat(result.player_id_list[0]);
          let current_user_chat = await bot.api.getChat(
            result.player_id_list[1]
          );
          await setMultipleMatchTurn(ctx.from.id, user_chat, current_user_chat);
          send(
            user_chat.id,
            `خب تو انتخاب شدی تا از بازیکن ${current_user_chat?.first_name} بپرسی شجاعت یا حقیقت ؟
لطفا برای پرسیدن روی دکمه ی بپرس شجاعت یا حقیقت بزن`,
            multiplayerMatchCurrentUserKeyboard.keyboard
          );
          send(
            current_user_chat?.id,
            `دوست من تو انتخاب شدی تا ${user_chat?.first_name} ازت بپرسه شجاعت یا حقیقت؟`,
            multiplayerMatchKeyboard.keyboard
          );
          result.player_id_list
            ?.filter(
              (item) => item !== user_chat.id && item !== current_user_chat.id
            )
            .map((item) => {
              send(
                item,
                ` 
قراره ${user_chat?.first_name} از ${current_user_chat.first_name} بپرسه شجاعت یا حقیقت؟
`,
                multiplayerMatchKeyboard.keyboard
              );
            });
        }
        // });
        ChangeFindPlayer();
        clearInterval(queueInterval);
        return;
      }
      // let getCurrentPlayer = await queue.findOne({ user_id: ctx.from.id });
      // if (!getCurrentPlayer) {
      //   ChangeFindPlayer();
      //   clearInterval(queueInterval);
      // }
    }
    // } else reply(ctx, "خطایی رخ داده لطفا کمی بعد دوباره امتحان کنید");
  }

  async playerSelectedTruthOrDare(ctx) {
    const match = await findMatch(ctx.from.id);
    if (!match) return;
    // if(match.players.filter(item => item.user_id === ctx.from.id && item.capacity <=0)) {
    //   ctx.reply(`حداکثر تعداد پرسش های شما تکمیل شده است.
    //   شما دیگر نمی توانید از کسی سوال بپرسید فقط می توانید پاسخ دهید`)
    // }
    const qst = match?.question;
    if (
      qst?.from?.id === ctx.from.id &&
      qst?.from?.truth === false &&
      qst?.from?.dare === false &&
      (qst?.to?.truth || qst?.to?.dare)
    ) {
      await disabledResendMessage(ctx.from.id);
      await advanceSend(ctx, qst?.to?.id, aboutMessageInlineKeyboard);
      reply(ctx, `پیامت برای ${qst.to.first_name} ارسال شد دوست من.`);
      match.players.map((item) => {
        if (item.user_id !== qst.from.id || item.user_id !== qst.to.id) {
          send(`${qst.from.first_name} به ${qst.to.first_name} گفت که باید چیکار کنه
کاری که ${qst.to.first_name} باید انجام بده: 

${ctx.message.text}`);
        }
      });
    } else if (
      qst?.from?.id === ctx.from.id &&
      qst?.from?.truth === null &&
      qst?.from?.dare === null
    ) {
      reply(
        ctx,
        `دوست من, قبلا یک بار درخواستت رو برای ${qst.to.first_name} فرستادی`
      );
    } else if (
      qst?.to?.id === ctx.from.id &&
      (qst?.to?.truth || qst?.to?.dare) &&
      qst?.from?.truth === false &&
      qst?.from?.dare === false
    ) {
      reply(
        ctx,
        `دوست من منتظر باش که ${qst.from.first_name} بهت بگه چیکار کنی`
      );
    } else if (
      qst?.to?.id === ctx.from.id &&
      (qst?.to?.truth || qst?.to?.dare) &&
      qst?.from?.truth === null &&
      qst?.from?.dare === null
    ) {
      match.players.map((item) => {
        if (item.user_id !== qst.to.id) {
          advanceSend(ctx, item.user_id, aboutMessageInlineKeyboard);
        }
      });
      let result = await changeTurnNextPlayer(ctx.from.id);
      send(
        ctx.from.id,
        `خب تو انتخاب شدی تا از بازیکن ${result?.question.to?.first_name} بپرسی شجاعت یا حقیقت ؟
لطفا برای پرسیدن روی دکمه ی بپرس شجاعت یا حقیقت بزن`,
        multiplayerMatchCurrentUserKeyboard.keyboard
      );
      send(
        result?.question?.to?.id,
        `دوست من تو انتخاب شدی تا ${result?.question?.from?.first_name} ازت بپرسه شجاعت یا حقیقت؟`,
        multiplayerMatchKeyboard.keyboard
      );
      result?.players
        ?.filter(
          (item) =>
            item.user_id !== result?.question?.from.id &&
            item.user_id !== result?.question?.to.id
        )
        .map((item) => {
          send(
            item.user_id,
            `به به ببین چی داریم 
قراره ${result?.question?.from?.first_name} از ${result?.question?.to?.first_name} بپرسه شجاعت یا حقیقت؟
`,
            multiplayerMatchKeyboard.keyboard
          );
        });
    }
  }
  async checkHasSendedQuestion(ctx, match) {
    if (match.question.from.id !== ctx.from.id) return false;
    if (match.question.to.truth || match.question.to.dare) {
      ctx.reply(
        `
 ${match?.question?.to?.first_name}
قبلا یک بار این سوال رو پرسیدی
        `
      );
      return false;
    }
  }
}

module.exports = Multiplayer;
