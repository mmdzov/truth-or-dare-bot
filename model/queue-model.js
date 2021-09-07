const { customAlphabet } = require("nanoid");
const queue = require("../schema/queue-schema");
const { newMatch } = require("./match-model");

class QueueModel {
  async startQueue(data) {
    try {
      let result = await queue.create(data);
      return Promise.resolve({ startQueue: true });
    } catch (e) {
      console.log(e);
      return Promise.resolve({ startQueue: false });
    }
  }
  async findUserBySexQueue(user_id, multiplayer, sex) {
    try {
      let result = await queue.find({
        multiplayer,
        sex: sex === "خانم" ? "آقا" : "خانم",
      });
      let current_user = await queue.find({ user_id });
      current_user = current_user[current_user.length - 1];
      if (current_user?.target_finded !== 0) {
        newMatch({
          players: [
            {
              user_id: current_user?.target_finded,
              capacity: 10,
              done: 0,
            },
            {
              user_id: user_id,
              capacity: 10,
              done: 0,
            },
          ],
          match_id: customAlphabet("123456789asdfghjklzxcvbnmqwertyuiop", 10)(),
          turn: 1,
        });
        await queue.findOneAndDelete({ user_id });
        await queue.findOneAndDelete({ user_id: current_user?.target_finded });
        return { target_user_id: current_user?.target_finded, user_id };
      }
      result = result.filter(
        (item) => item.user_id !== user_id && item?.target_finded === 0
      );
      let random = Math.floor(Math.random() * result.length);
      let res = await queue
        .findByIdAndUpdate(result[random]?._id, {
          $set: { target_finded: user_id },
        })
        .then((res) => {
          // await queue.findOneAndDelete({ user_id });
        });
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new QueueModel();
