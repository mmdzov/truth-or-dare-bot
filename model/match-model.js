const { findOneAndUpdate } = require("../schema/match-schema");
const match = require("../schema/match-schema");

class MatchModel {
  async newMatch(data) {
    try {
      let result = await match.create(data);
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async findMatch(user_id) {
    try {
      let result = await await match.find({});
      result = result
        .map((item) => {
          let findPlayer = item.players.filter(
            (player) => player.user_id === user_id
          );
          if (findPlayer.length > 0) {
            return item;
          }
        })
        .filter((item) => item)[0];
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async selectMatchSenderReceiver(sender, receiver) {
    try {
      let matchGame = await new MatchModel().findMatch(sender);
      let result = await match.findOneAndUpdate(
        { _id: matchGame._id },
        { sender, receiver }
      );
      // console.log(result);
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async changeNextTurn(sender) {
    try {
      let matchResult = await new MatchModel().findMatch(sender);
      let result = await match.findOneAndUpdate(
        { receiver: sender },
        {
          turn:
            matchResult?.players?.length <= matchResult?.turn
              ? 1
              : matchResult?.turn + 1,
        }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async setAnswer(user_id, answer) {
    try {
      let matchFinded = await new MatchModel().findMatch(user_id);
      let index = matchFinded.players.findIndex(
        (item) => item.user_id === user_id
      );
      if (index === -1) return;
      matchFinded.players[index].answer = answer;
      let result = await match.findOneAndUpdate(
        { match_id: matchFinded.match_id },
        { players: matchFinded.players },
        { new: true }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async clearAnswers(user_id) {
    try {
      let matchFinded = await new MatchModel().findMatch(user_id);
      matchFinded.players.map((item) => {
        item.answer = "";
        return item;
      });
      let result = await match.findOneAndUpdate(
        { match_id: matchFinded.match_id },
        { players: matchFinded.players }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async detectPlayerTurn(user_id, current_player) {
    let current_match = await new MatchModel().findMatch(user_id);
    let hasTurn = current_match.players[current_match.turn - 1];
    let currentIndex = current_match.players.findIndex(
      (item) => item.user_id === current_player
    );
    return {
      hasTurn: hasTurn.user_id === current_player,
      playerTurn: current_match.players[currentIndex].turn,
    };
  }
  async selectPlayerTurn(user_id, current_player, turn = true) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      current_match.players = current_match.players.map((item) => {
        if (item.user_id === current_player) {
          item.turn = turn;
          return item;
        } else {
          item.turn = !turn;
          return item;
        }
      });
      let res = await match.findOneAndUpdate(
        { match_id: current_match.match_id },
        { players: current_match.players },
        { new: true }
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }
  async changeCapacity(user_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      current_match.players[current_match - 1].capacity =
        current_match.players[current_match - 1].capacity - 1;
      if (current_match.players[current_match - 1].capacity <= 0) {
        await match.findOneAndDelete({ _id: current_match._id });
        return { finished_game: true };
      }
      await match.findByIdAndUpdate(
        { match_id: current_match.match_id },
        { players: current_match.players }
      );
    } catch (e) {
      console.log(e);
    }
  }
  async hiddenMesssagePlayer(user_id, target_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      let index = current_match.players.findIndex(
        (item) => item.user_id === user_id
      );
      let current_user = current_match.players[index];
      if (!current_user?.hiddenMessages) {
        current_user.hiddenMessages = [];
      }
      if (current_user?.hiddenMessages?.includes(target_id)) {
        return { alreadyHided: true };
      }
      current_user?.hiddenMessages.push(target_id);
      current_match.players[index] = current_user;
      await match.findByIdAndUpdate(
        { _id: current_match._id },
        { players: current_match.players },
        { new: true }
      );
      return { hided: true };
    } catch (e) {
      console.log(e);
    }
  }
  async showMesssagePlayer(user_id, target_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      let index = current_match.players.findIndex(
        (item) => item.user_id === user_id
      );
      let current_user = current_match.players[index];
      if (!current_user?.hiddenMessages) {
        current_user.hiddenMessages = [];
      }
      if (current_user?.hiddenMessages?.includes(target_id)) {
        current_user.hiddenMessages = current_user?.hiddenMessages.filter(
          (item) => item !== target_id
        );
        current_match.players[index] = current_user;
        await match.findByIdAndUpdate(
          { _id: current_match._id },
          { players: current_match.players },
          { new: true }
        );
        return { showing: true };
      }
      return { alreadyShow: true };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new MatchModel();
