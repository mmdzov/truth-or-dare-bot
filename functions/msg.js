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

module.exports = { reply, send };
