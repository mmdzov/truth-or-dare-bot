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
  async findAndNewMatch(user_id, multiplayer, sex) {
    try {
      let result = await queue.find({
        multiplayer,
        sex: sex === "خانم" ? "آقا" : "خانم",
      });
      let current_user = await queue.find({ user_id });
      current_user = current_user[current_user.length - 1];
      if (current_user?.target_finded) {
        let new_match_data = await newMatch({
          players: [
            {
              user_id: current_user?.target_finded,
              capacity: 10,
              turn: true,
              done: 0,
              answer: "",
            },
            {
              user_id: user_id,
              capacity: 10,
              turn: false,
              done: 0,
              answer: "",
            },
          ],
          player_numbers: 2,
          sender: 0,
          receiver: 0,
          player_count: current_user.multiplayer,
          match_id: customAlphabet("123456789asdfghjklzxcvbnmqwertyuiop", 10)(),
          turn: 1,
        });
        await queue.findOneAndDelete({ user_id });
        await queue.findOneAndDelete({ user_id: current_user?.target_finded });
        return {
          target_user_id: current_user?.target_finded,
          user_id,
          new_match_data,
        };
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

  async handleNewMultipleMatch(players, multiplayer, player_numbers) {
    let playerParams = players.map((item, index) => {
      return {
        user_id: item.user_id,
        capacity: 10,
        turn: index === 0,
        done: 0,
        hiddenMessages: [],
        answer: "",
        player_number: index + 1,
      };
    });
    return await newMatch({
      players: playerParams,
      player_count: multiplayer,
      player_numbers: player_numbers,
      match_id: customAlphabet("123456789asdfghjklzxcvbnmqwertyuiop", 10)(),
      turn: 1,
    });
  }
  async findMultipleMatch(user_id, allowPlayers = 2, player_numbers) {
    try {
      let multiples = await queue.find({ multiplayer: allowPlayers });
      // if (!multiples || multiples?.length === 0) return;
      const queueModel = new QueueModel();
      let current_player = multiples.filter(
        (item) => item.user_id === user_id
      )[0];
      // console.log(user_id, current_player, userData);
      if (current_player?.matched?.length > 0) {
        let hasAllowPlayerCount = multiples.filter(
          (item) => item.matched === current_player.matched
        );
        if (hasAllowPlayerCount.length >= allowPlayers) {
          let result = await queueModel.handleNewMultipleMatch(
            hasAllowPlayerCount,
            allowPlayers,
            player_numbers
          );
          await queue.deleteMany({ matched: current_player?.matched });
          return {
            startMatch: true,
            player_id_list: result.players.map((item) => {
              return item.user_id;
            }),
            result,
          }; //? start match and queue capacity
        }
        let otherQueues = multiples.filter(
          (item) => item.user_id !== user_id && item.matched === ""
        );
        const rand = Math.floor(Math.random() * otherQueues.length - 1);
        const target = otherQueues[rand === -1 ? 0 : rand];
        target.matched = current_player.matched;
        await queue.findOneAndUpdate(
          { user_id: target.user_id },
          { matched: target.matched }
        );
        return { joinedNewPlayer: true }; //? joined new player to your queue
      }
      let getQueues = multiples.filter(
        (item) => item.user_id !== user_id && item.matched === ""
      );
      let filledQueues = multiples.filter((item) => item.matched !== "");
      let queues = filledQueues.reduce((all, curr) => {
        try {
          if (curr !== undefined) {
            if (!all || !Object.keys(all).includes(curr.matched)) {
              all[curr.matched] = {
                multiplayer: curr.multiplayer,
                match_id: curr.match_id,
                players: [{ ...curr }],
              };
            } else {
              all[curr.matched] = {
                ...all[curr.matched],
                players: [...all[curr.matched].players, { ...curr }],
              };
            }
            return all;
          }
        } catch (e) {}
      }, {});

      //* create a match
      if (!queues || Object.keys(queues)?.length === 0) {
        if (!getQueues || getQueues?.length === 0)
          return { waitForJoinUsers: true }; //? waiting for join users to queue
        const rand = Math.floor(Math.random() * getQueues.length - 1);
        await queue.findOneAndUpdate(
          { user_id: current_player.user_id },
          { matched: current_player.queue_unique_id }
        );
        await queue.findOneAndUpdate(
          { user_id: getQueues[rand === -1 ? 0 : rand]?.user_id },
          { matched: current_player.queue_unique_id }
        );
        return { joinedNewPlayer: true }; //? joined new player to your queue
      }

      //* get enabled queue match_id's
      let match_list = [];
      for (let i in queues) {
        if (queues[i]?.multiplayer > queues[i]?.players?.length) {
          match_list.push(queues[i]?.match_id);
        }
      }

      //* joining to a match
      let checkExtraCapacity = {
        force_start: false,
        match_id: "",
      };

      for (let i in match_list) {
        let queueFocused = await queue.find({ matched: match_list[i] });
        if (queueFocused[0]?.multiplayer > queueFocused?.length) {
          checkExtraCapacity = {
            match_id: queueFocused[0]?.matched,
            force_start:
              queueFocused.length + 1 === queueFocused[0]?.multiplayer,
          };
          break;
        }
      }

      //* new matched player
      if (checkExtraCapacity.match_id !== "") {
        await queue.findOneAndUpdate(
          { user_id },
          { matched: checkExtraCapacity.match_id }
        );
        if (checkExtraCapacity.force_start) {
          let result = await queueModel.handleNewMultipleMatch(
            hasAllowPlayerCount,
            allowPlayers,
            player_numbers
          );
          await queue.deleteMany({ matched: checkExtraCapacity.match_id });
          return {
            startMatch: true,
            player_id_list: result.players.map((item) => {
              return item.user_id;
            }),
            result,
          }; //? start match and queue capacity completed
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new QueueModel();
