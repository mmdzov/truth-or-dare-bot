const bot = require("../config/require");

function reply(ctx, message, keyboard) {
  ctx.reply(message, {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
    },
  });
}
async function send(user_id, message, keyboard, ...options) {
  return await bot.api.sendMessage(user_id, message, {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      ...options,
    },
    ...options,
  });
}

module.exports = { reply, send };
