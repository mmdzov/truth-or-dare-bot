const { InlineKeyboard } = require("grammy");

let inviteToGameQuestion = (user_id) => {
  return new InlineKeyboard().row(
    { text: `لغو دعوت❌`, callback_data: `reject_invite_join_game ${user_id}` },
    {
      text: "تایید دعوت و ورود✅",
      callback_data: `accept_invite_join_game ${user_id}`,
    }
  );
};

module.exports = {
  inviteToGameQuestion,
};
