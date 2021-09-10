const { Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const { startQueue, findAndNewMatch } = require("../model/queue-model");

class Multiplayer {
  constructor() {}
  async handleStartQueue(ctx, multiplayer) {
    ctx.session.waitForFindPlayer = true;
    const data = {
      multiplayer,
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
      let queue = setInterval(() => newMatchUser(ctx), 8000);
      async function newMatchUser() {
        if (ctx.session.waitForFindPlayer === false) {
          return clearInterval(queue);
        }
        // let result = await findMultipleMatch(ctx.from.id, multiplayer);
        let result = await findMultipleMatch(ctx.from.id);
        if (result?.startMatch) {
          ctx.reply(`تیم تکمیل شد و بازی شروع می شود.`);
        }
        // if (
        //   res?.new_match_data?.players.filter(
        //     (item) => item.user_id === ctx.from.id
        //   ).length > 0
        // ) {
        //   reply(
        //     ctx,
        //     "بازیکن یافت شد اول اون بازیو شروع میکنه دوست من",
        //     matchPlayingKeyboard.keyboard
        //   );
        //   send(
        //     res.target_user_id,
        //     `بازیکن یافت شد دوست من اول تو بازی رو شروع کن`,
        //     matchPlayingKeyboard.keyboard
        //   );
        //   ctx.session.waitForFindPlayer = false;
        //   ChangeFindPlayer();
        //   clearInterval(queue);
        // }
      }
    } else reply(ctx, "خطایی رخ داده لطفا کمی بعد دوباره امتحان کنید");
  }
}

module.exports = Multiplayer;
