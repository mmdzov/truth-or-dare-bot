const { Keyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const multiplayerMatchKeyboard = require("../keyboard/multiplayer-match-keyboard");
const {
  startQueue,
  findAndNewMatch,
  findMultipleMatch,
} = require("../model/queue-model");
const queue = require("../schema/queue-schema");
const { reply, send } = require("./msg");

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
          result?.player_id_list?.map((id) => {
            send(
              id,
              `تیم تکمیل شد و بازی شروع می شود.`,
              multiplayerMatchKeyboard.keyboard
            );
          });
          ChangeFindPlayer();
          clearInterval(queueInterval);
          return;
        }
        let getCurrentPlayer = await queue.findOne({ user_id: ctx.from.id });
        if (!getCurrentPlayer) {
          ChangeFindPlayer();
          clearInterval(queueInterval);
        }
      }
    } else reply(ctx, "خطایی رخ داده لطفا کمی بعد دوباره امتحان کنید");
  }
}

module.exports = Multiplayer;
