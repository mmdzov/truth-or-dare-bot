const { InlineKeyboard } = require("grammy");
const { getUserFriends } = require("../model/user-model");

const finishGameKeyboard = async (users = [], user_id) => {
  const friends = await getUserFriends(user_id);

  const inline = new InlineKeyboard();
  users
    .filter((item) => item.id !== user_id)
    .map((item) => {
      inline.row({
        text: item.first_name,
        callback_data: "fnameplayer",
      });
      if (!friends.includes(item.id)) {
        inline.text("➕", `send_request_add_friend ${item.id}`);
      }
    });
  return inline;
};

const getFriendRequest = (user_id) => {
  return new InlineKeyboard().row(
    {
      text: "رد درخواست❌",
      callback_data: `reject_request_to_add_friend ${user_id}`,
    },
    {
      text: "قبول درخواست✅",
      callback_data: `accept_request_to_add_friend ${user_id}`,
    }
  );
};

module.exports = {
  finishGameKeyboard,
  getFriendRequest,
};
