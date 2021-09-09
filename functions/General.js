const { InlineKeyboard } = require("grammy");
const bot = require("../config/require");
const {
  findMatch,
  hiddenMesssagePlayer,
  showMesssagePlayer,
} = require("../model/match-model");
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
    reply(ctx, "پیام شما به تمام بازیکنان ارسال شد");
  }

  async callbackQueryData(ctx) {
    let data = ctx.callbackQuery.data;
    if (!data.includes("hiddenMessages") || !data.includes("showMessages"))
      return;
    let match = await findMatch(ctx.from.id);
    if (!match) {
      ctx.reply("شما هنوز بازی شروع نکردید");
      return;
    }
    if (data.includes("hiddenMessages")) {
      let result = await hiddenMesssagePlayer(
        ctx.from.id,
        +data.match(/[0-9]/g).join("")
      );
      if (result?.alreadyHided) {
        reply(ctx, "قبلا مخفی کردن پیام های این بازیکن را اعمال کردید");
      } else if (result?.hided) {
        reply(ctx, "پیام های این بازیکن دیگر برای شما نمایش دلده نمی شوند");
      }
    } else if (data.includes("showMessages")) {
      let result = await showMesssagePlayer(
        ctx.from.id,
        +data.match(/[0-9]/g).join("")
      );
      if (result?.alreadyShow) {
        reply(ctx, "قبلا نمایش پیام های این بازیکن را اعمال کردی");
      } else if (result?.showing) {
        reply(ctx, "پیام های این بازیکن برای شما نمایش داده می شوند");
      }
    }
  }
}

module.exports = General;
