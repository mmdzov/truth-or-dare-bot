const bot = require("../config/require");
const {
  newGameAdminKeyboard,
  newGameFriendshipKeyboard,
  newPlayerInlineSetting,
} = require("../keyboard/friendship-keyboard");

function joinGame(ctx, result) {
  if (result?.joined === true) {
    ctx.reply(`شما وارد بازی شدید`, {
      reply_markup: {
        keyboard: newGameAdminKeyboard(result.match).keyboard,
        resize_keyboard: true,
      },
    });
    result?.players.map((item) => {
      if (item.id === ctx.from.id) return;
      if (result?.match?.started && result.players.length === 2) {
        bot.api.sendMessage(
          result.match.turn.from.id,
          `قرار است ${result.match.turn.to.first_name} را به چالش بکشید
  حالا روی دکمه ی بپرس بزن تا شجاعت یا حقیقت رو انتخاب کنه`,
          {
            reply_markup: {
              keyboard: newGameFriendshipKeyboard(
                result?.match,
                result?.match?.mode,
                true
              ).keyboard,
              resize_keyboard: true,
            },
          }
        );
        ctx.reply(
          `شما شرکت کننده دوم در این بازی هستی صبر کن تا بازیکن ${result.match.turn.from.first_name} ازت بپرسه شجاعت یا حقیقت`
        );
      }

      if (!item.isOwner) {
        bot.api
          .sendMessage(
            item.id,
            `
  کاربر جدید ${ctx.from.first_name} وارد بازی شد`
            // {
            //   reply_markup: {
            //     inline_keyboard: newPlayerInlineSetting(
            //       ctx.from.id,
            //       false,
            //       item.admin?.remove_player,
            //       item.admin?.limit_player,
            //       item.admin?.add_new_admin
            //     ).inline_keyboard,
            //   },
            // }
          )
          .catch((e) => {});
      } else if (item?.id !== ctx.from.id) {
        bot.api
          .sendMessage(
            item.id,
            `
    کاربر جدید ${ctx.from.first_name} وارد بازی شد`,
            {
              reply_markup: {
                inline_keyboard: newPlayerInlineSetting(ctx.from.id, true)
                  .inline_keyboard,
              },
            }
          )
          .catch((e) => {});
      }
    });
  }
}

module.exports = joinGame;
