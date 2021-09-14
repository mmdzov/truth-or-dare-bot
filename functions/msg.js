const bot = require("../config/require");

function reply(ctx, message, keyboard) {
  ctx.reply(message, {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
    },
  });
}
async function send(user_id, message = "", keyboard, ...options) {
  try {
    return await bot.api.sendMessage(user_id, message, {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        ...options,
      },
      ...options,
    });
  } catch (e) {}
}

async function advanceSend(ctx, to = "", keyboard = {}, callback = () => {}) {
  try {
    const Method = [
      "sendVoice",
      "sendAudio",
      "sendDocument",
      "sendAnimation",
      "sendVideo",
      "sendSticker",
      "sendPhoto",
      "sendMessage",
    ];

    for (let i in Method) {
      let n = Method[i].split("send").join("").toLowerCase();
      if (n === "message") n = "text";
      if (ctx.message?.[n]) {
        bot.api?.[Method[i] === "photo" ? "replyWithPhoto" : Method[i]](
          to,
          ctx.message?.[n]?.file_id ??
            ctx.message?.[n][0]?.file_id ??
            ctx.message?.[n],
          {
            caption: ctx.message?.caption ?? ctx.message?.text,
            reply_markup: keyboard,
          }
        );
        callback();
        break;
      }
    }
  } catch (e) {}
}

module.exports = { reply, send, advanceSend };
