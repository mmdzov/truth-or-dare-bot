const bot = require("../config/require");
const {
  findOneAndUpdate,
  findOneAndDelete,
} = require("../schema/match-schema");
const match = require("../schema/match-schema");
const user = require("../schema/user-schema");

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
    if (!current_match) return;
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
  async selectSpecificPlayerTurn(user_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      let question = current_match?.question;
      current_match.players = current_match.players.map((item) => {
        if (question.to.id === user_id || question.from.id === user_id) {
          item.turn = !item.turn;
        } else item.turn = false;
        return item;
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

  async selectTruthOrDare(user_id, truth = null, dare = null) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      current_match.question.to.truth = truth ? truth : false;
      current_match.question.to.dare = dare ? dare : false;
      current_match.question.from.truth = false;
      current_match.question.from.dare = false;
      let res = await match.findOneAndUpdate(
        { match_id: current_match.match_id },
        { question: current_match.question },
        { new: true }
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  async disabledResendMessage(user_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      current_match.question.from.truth = null;
      current_match.question.from.dare = null;
      let res = await match.findOneAndUpdate(
        { match_id: current_match.match_id },
        { question: current_match.question },
        { new: true }
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  async changeTurnNextPlayer(user_id) {
    try {
      const current_match = await new MatchModel().findMatch(user_id);
      let rand = Math.floor(Math.random() * current_match.players.length - 2);
      let player = current_match.players;
      const index = player.findIndex((item) => item.turn);
      if (
        player[index].capacity === 0 &&
        player.filter(
          (item) =>
            item.user_id !== current_match.question.from.id && item.capacity > 0
        )
      ) {
        bot.api.sendMessage(
          current_match.question.from.id,
          `
تعداد سوال های پرسیده شده ی شما به 10 تا رسید الان تنها فقط بازیکنان باقی مانده می توانند از شما سوال کنند.
        `
        );
      }
      player[index].turn = false;
      player[index].capacity -= 1;
      if (player[index + 1]) {
        player[index + 1].turn = true;
      } else player[0].turn = true;
      //* check beshe! age user montakhab capacity === 0 dasht byd nobat be nafar baadi bere

      let selectTarget =
        player.length === 2
          ? player[current_match.turn === 1 ? 0 : 1]
          : player.filter(
              (item) =>
                // item.user_id !== current_match.question.from.id &&
                item.user_id !== current_match.question.to.id
            )[rand === -1 ? 0 : rand];
      let user_chat = await bot.api.getChat(
        player.filter((item) => item.turn)[0]?.user_id
      );
      let target_user_chat = await bot.api.getChat(selectTarget?.user_id);
      current_match.question = {
        from: user_chat,
        to: target_user_chat,
      };
      console.log(
        current_match.turn,
        player.length >= current_match.turn ? current_match.turn + 1 : 1,
        player.length,
        current_match.turn
      );
      let res = await match.findOneAndUpdate(
        { _id: current_match._id },
        {
          players: player,
          question: current_match.question,
          turn: player.findIndex((item) => item.turn) + 1,
          // turn:
          //   player.length >= current_match.turn ? current_match.turn + 1 : 1,
        },
        { new: true }
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  async playerRelocation(user_id) {
    try {
      let current_match = await new MatchModel().findMatch(user_id);
      let question = current_match.question;
      question.from = current_match.question.to;
      question.to = current_match.question.from;
      question.to.truth = false;
      question.to.dare = false;
      question.from.truth = false;
      question.from.dare = false;
      let res = await match.findOneAndUpdate(
        { match_id: current_match.match_id },
        { question: question },
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

  async checkUserReport(user_id, target_id, message = "", mode = "") {
    try {
      const current_match = await new MatchModel().findMatch(user_id);
      let targetIndex = current_match.players.findIndex(
        (item) => item.user_id === target_id
      );
      if (targetIndex === -1) return { not_found: true };
      if (
        current_match.players[targetIndex].reports.user_id.filter(
          (item) => item === user_id
        ).length > 0
      )
        return { prevReported: true };
      if (mode === "finally") {
        const target = current_match.players[targetIndex];
        if (target?.reports?.length >= current_match.player.length - 1) {
          let userData = await user.findOne({ user_id: target_id });
          let report = {
            user_id: current_match.players[targetIndex].reports.map(
              (item) => item.user_id
            ),
            message: current_match.players[targetIndex].reports.map(
              (item) => item.message
            ),
          };
          userData.reports.push(report);
          let players = current_match.players.filter(
            (item) => item.user_id !== target_id
          );
          await match.findOneAndUpdate(
            { match_id: current_match.match_id },
            { players: players }
          );
          await user.findOneAndUpdate(
            { user_id: userData.user_id },
            { reports: userData.reports }
          );
          return {
            remove_user: true,
            users: current_match.players
              .filter(
                (item) =>
                  item.user_id !== ctx.from.id && item.user_id !== target_id
              )
              .map((item) => item.user_id),
          };
        }
        let report = {
          user_id: user_id,
          message,
        };
        if (!current_match.players[targetIndex]?.reports) {
          current_match.players[targetIndex].reports = [];
        }
        current_match.players[targetIndex]?.reports?.push(report);
        match.findOneAndUpdate(
          { match_id: current_match.match_id },
          { players: current_match.players }
        );
        return {
          report: true,
          users: current_match.players
            .filter(
              (item) =>
                item.user_id !== ctx.from.id && item.user_id !== target_id
            )
            .map((item) => item.user_id),
        };
      }
    } catch (e) {}
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
  async deleteMatch(user_id) {
    try {
      const current_match = await new MatchModel().findMatch(user_id);
      await match.findOneAndDelete({ _id: current_match._id });
    } catch (e) {
      console.log(e);
    }
  }
  async exitMatch(user_id) {
    try {
      const current_match = await new MatchModel().findMatch(user_id);
      let players = current_match.players.filter(
        (item) => item.user_id !== user_id
      );
      if (players.length === 1) {
        new MatchModel().deleteMatch(user_id);
        return { delete: true };
      }
      await match.findOneAndUpdate({ _id: current_match._id }, { players });
      return { leave: true };
    } catch (e) {
      console.log(e);
    }
  }
  async setMultipleMatchTurn(user_id, from, to) {
    let current_match = await new MatchModel().findMatch(user_id);
    await match.findOneAndUpdate(
      { _id: current_match?._id },
      { question: { from, to } }
    );
  }
}

module.exports = new MatchModel();
