const { InlineKeyboard } = require("grammy");
const { customAlphabet } = require("nanoid");
const bot = require("../config/require");
const friendsMatch = require("../schema/friends-match-schema");
const { getUserFriends } = require("./user-model");

class FriendsMatchModel {
  async newMatch(data) {
    try {
      const owner = await friendsMatch
        .findOne({ owner: data.owner })
        .select("owner");
      if (!owner) {
        try {
          let result = await friendsMatch.create(data);
          return result;
        } catch (e) {
          console.log(e);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async findFriendMatch(user_id) {
    try {
      let match = await friendsMatch.find({});
      match = match.filter(
        (item) => item.players.filter((_) => _.id === user_id).length > 0
      )[0];
      if (!match) return false;
      return match;
    } catch (e) {
      console.log(e);
    }
  }

  async leavePlayerBeforeStart(user_id) {
    try {
      const current_match = await new FriendsMatchModel().findFriendMatch(
        user_id
      );
      if (!current_match) return false;
      if (current_match.started) return false;
      const players = current_match.players.filter(
        (item) => item.id !== user_id
      );
      const result = await friendsMatch.findOneAndUpdate(
        { _id: current_match._id },
        { players },
        { new: true }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async friendMatchselectTruthOrDare(user_id, mode = "") {
    try {
      const friendMatch = await new FriendsMatchModel().findFriendMatch(
        user_id
      );
      if (!friendMatch) return { not_found: true };
      if (friendMatch.turn?.to?.id !== user_id) return { not_turn: true };
      if (friendMatch.turn.to?.mode?.length > 0)
        return { already_selected: true };
      friendMatch.turn.to.mode = mode;
      const match = await friendsMatch.findOneAndUpdate(
        { _id: friendMatch._id },
        {
          turn: friendMatch.turn,
        },
        { new: true }
      );
      return { match };
    } catch (e) {
      console.log(e);
    }
  }

  async getMatchLimits(user_id) {
    try {
      const ff = new FriendsMatchModel();
      const match = await ff.findFriendMatch(user_id);
      if (!match) return false;
      return match.limits;
    } catch (e) {
      console.log(e);
    }
  }

  async hasOwnerPlayer(user_id) {
    const match = await new FriendsMatchModel().findFriendMatch(user_id);
    if (!match) return false;
    return user_id === +match.owner;
  }

  async hasAccessFeature(user_id, access_key) {
    try {
      const getMatch = await new FriendsMatchModel().findFriendMatch(user_id);
      if (!getMatch) return false;
      const player = getMatch.players.filter((item) => item.id === user_id)[0];
      if (!player.admin[access_key] && +getMatch.owner !== user_id)
        return false;
      return { player, match: getMatch };
    } catch (e) {
      console.log(e);
    }
  }

  async changeLimitStatus(match, key) {
    try {
      let index = match.limits.findIndex((item) => item.name === key);
      match.limits[index].enabled = !match.limits[index].enabled;

      let result = await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { limits: match.limits },
        {
          new: true,
        }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async deleteMatch(user_id) {
    try {
      const owner = await friendsMatch.findOne({ owner: user_id + "" });
      if (owner) {
        await friendsMatch.findOneAndDelete({ owner: user_id + "" });
        return owner;
      }
      return false;
    } catch (e) {
      console.log(e);
    }
  }

  async getPublicMatchs() {
    try {
      let matchs = await friendsMatch.find({});
      matchs = matchs.filter((item) => item.mode === "public");
      matchs = matchs.map((item) => ({
        playerLength: item.players.length,
        started: item?.started ?? false,
        name: item.name,
        match_id: item._id,
      }));
      return matchs;
    } catch (e) {
      console.log(e);
    }
  }

  async openPublicMatch(_id, user = {}) {
    try {
      const checkMatchJoined = await new FriendsMatchModel().findFriendMatch(
        user?.id
      );
      if (checkMatchJoined) return { alreadyJoinedAMatch: true };
      const match = await friendsMatch.findOne({ _id });
      if (!match) return { not_exist: true };
      if (match.mode === "private") return { is_private: true };
      let result = await new FriendsMatchModel().joinUserToFriendMatch(
        match.secret_link,
        user
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async getPlayersMatch(_id) {
    try {
      const match = await friendsMatch.findOne({ _id });
      if (!match) return { not_found: true };
      return { players: match?.players };
    } catch (e) {
      console.log(e);
    }
  }

  async createModifyLink(user_id, secret_link) {
    try {
      const match = await new FriendsMatchModel().findFriendMatch(user_id);
      if (!match) return false;
      let matchs = await friendsMatch.find({});
      matchs = matchs.filter((item) => item._id !== match._id);
      let similarLinks = matchs.filter(
        (item) => item.secret_link === secret_link
      );
      if (similarLinks.length > 0) return { alreadyExist: true };
      await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { secret_link: secret_link }
      );
      return {
        updated: true,
        players: match.players.filter((item) => item.id !== user_id),
      };
    } catch (e) {
      console.log(e);
    }
  }

  async changeGameMode(user_id) {
    const access = await new FriendsMatchModel().hasAccessFeature(
      user_id,
      "change_game_mode"
    );
    if (!access) return false;
    const newMode = access.match.mode === "private" ? "public" : "private";
    let result = await friendsMatch.findOneAndUpdate(
      { _id: access.match._id },
      { mode: newMode },
      { new: true }
    );
    return {
      mode: newMode,
      access,
      isOwner: +access.match.owner === user_id,
      match: result,
    };
  }

  async getAllPlayers(match_link, user_id) {
    let match = null;
    if (match_link) {
      match = await friendsMatch.findOne({ secret_link: match_link });
    } else {
      match = await friendsMatch.find({});
      match = match.filter(
        (item) => item.players.map((_) => _.id === user_id).length > 0
      )[0];
    }
    let players = match.players?.map((item) => item.id);
    return [...players];
  }

  async removePlayer(user_id, target_id) {
    try {
      const match = await new FriendsMatchModel().findFriendMatch(user_id);
      const players = match.players.filter((item) => item.id !== target_id);
      if (match.players.filter((item) => item.id === target_id).length === 0)
        return { not_exist: true };
      await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { players: players }
      );

      return { players: match.players };
    } catch (e) {
      console.log(e);
    }
  }

  async checkUserInGame(user_id) {
    try {
      const match = await new FriendsMatchModel().findFriendMatch(user_id);
      if (match && Object.keys(match)?.length > 0)
        return { user_in_game: true };
      return false;
    } catch (e) {}
  }

  async leaveFriendGame(user_id) {
    const fmm = new FriendsMatchModel();
    try {
      const match = await fmm.findFriendMatch(user_id);
      if (!match) return { not_exist: true };
      const turn = match.turn;
      let user_turn = { type: "", data: {}, turn: {} };
      if (+match.owner === user_id) {
        let matchDeleted = await fmm.deleteMatch(user_id);
        return { matchDeleted };
      }

      for (let i in turn) {
        if (turn[i].id === user_id) {
          user_turn = { type: i, data: turn[i] };
        }
      }

      let players = match.players.filter((item) => item.id !== user_id);

      const userIndex = match.players.findIndex(
        (item) => item.id === user_turn.data?.id
      );

      if (userIndex !== -1 && user_turn.type.length > 0) {
        const from = players[userIndex] ? players[userIndex] : players[0];
        let to = players.filter((item) => item.id !== from.id);
        to = to[Math.floor(Math.random() * to.length)];
        user_turn.turn = { from, to };
      } else {
        user_turn.turn = match.turn;
      }

      if (players.length <= 1 && user_turn.type?.length > 0) {
        user_turn.turn[user_turn.type] = {};
      }

      let matchResult = await friendsMatch.findOneAndUpdate(
        { _id: match?._id },
        { players, turn: user_turn.turn },
        { new: true }
      );
      return { matchResult, user_turn };
    } catch (e) {
      console.log(e);
    }
  }

  async changePlayerAccess(user_id, access_key) {
    try {
      const getMatchs = await friendsMatch.find({});
      const match = getMatchs.filter((item) =>
        item.players.map((_) => _.id === user_id)
      )[0];
      const index = match.players.findIndex((item) => item.id === user_id);
      match.players[index].admin[access_key.split(" ").join("")] =
        !match.players[index].admin[access_key.split(" ").join("")];
      if (Object.values(match.players[index].admin).includes(true)) {
        match.players[index].admin.isAdmin = true;
        if (!match.admins.includes(user_id)) {
          match.admins.push(user_id);
        }
      } else {
        match.players[index].admin.isAdmin = false;
        match.admins = match.admins.map((item) => item !== user_id);
      }
      await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { players: match.players, admins: match.admins }
      );
      return {
        match: match,
        admin: match.players[index].admin,
        changed: {
          [access_key]:
            match.players[index].admin[access_key.split(" ").join("")],
        },
      };
    } catch (e) {
      console.log(e);
    }
  }

  async checkPlayerAdmin(match_id, user_id) {
    try {
      const match = await friendsMatch.findOne({ _id: match_id });
      const player = match.players.filter((item) => item.id === user_id)[0];
      if (player.admin.isAdmin || player.isOwner) {
        return player;
      }
      return false;
    } catch (e) {
      console.log(e);
    }
  }

  async startGame(user_id) {
    const ff = new FriendsMatchModel();
    try {
      const match = await ff.findFriendMatch(user_id);
      await ff.checkPlayerAdmin(match._id, user_id);
      // if (!result || match.started) return false; //!default enabled
      let result = await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { started: true },
        { new: true }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async getMyFriends(user_id) {
    const result = await getUserFriends(user_id);
    if (result.length === 0) return { not_exist: true };

    let keyboard = new InlineKeyboard();

    for (let i = 0; i < result.length; i++) {
      let user = await bot.api.getChat(result[i]);
      keyboard.row(
        {
          text: user.first_name,
          callback_data: "friend-username",
        },
        // { text: "💭", callback_data: `friend-chat-user ${user.id}` },
        { text: "🗑", callback_data: `friend-delete-user ${user.id}` }
      );
    }
    return { keyboard };
  }

  async saveMessagePlayer(user_id, data = {}) {
    try {
      const friendMatch = await new FriendsMatchModel().findFriendMatch(
        user_id
      );
      let result = { finded: false, turn: {} };
      const turn = friendMatch.turn;
      for (let i in turn) {
        if (turn[i].id === user_id) result = { finded: true, turn: turn[i] };
      }
      if (!result.finded) return;
      if (turn.from.id === user_id) {
        if (typeof turn.from?.turn === "undefined") {
          turn.from.turn = true;
          if ((turn?.to?.id + "").length > 0) {
            turn.to.turn = false;
          }
        }
        turn.from.payload = JSON.stringify(data);
      } else if (turn?.to?.id === user_id) {
        if (typeof turn?.to?.turn === "undefined") return;
        turn.to.payload = JSON.stringify(data);
      }
      let res = await friendsMatch.findOneAndUpdate(
        { _id: friendMatch._id },
        {
          turn,
        },
        { new: true }
      );
      return res;
    } catch (e) {
      console.log(e);
    }
  }

  async playerChangeTurn(user_id) {
    try {
      const match = await new FriendsMatchModel().findFriendMatch(user_id);
      if (match.turn?.to?.id !== user_id) return { turn: false };
      let index = match.players.findIndex(
        (item) => item.id === match.turn.from.id
      );
      let i = !match.players[index + 1] ? 0 : index + 1;

      let players = match.players.filter(
        (item) => item.id !== match.players[i].id
      );

      const rand = Math.floor(Math.random() * players.length);
      const player = !players[rand] ? players[rand - 1] : players[rand];

      const turn = {
        from: { ...match.players[i], turn: true },
        to: { ...player, turn: false },
      };

      const result = await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { turn },
        { new: true }
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async sendMessageChangeTurn(user_id) {
    try {
      const current_match = await new FriendsMatchModel().findFriendMatch(
        user_id
      );
      let turn = {
        data: "",
        type: "",
        prev_type: "",
      };

      for (let i in current_match.turn) {
        if (current_match.turn[i].turn) {
          const prev = i === "from" ? "to" : "from";
          turn = {
            data: current_match.turn[i],
            prev_data: current_match.turn[prev],
            type: i,
            prev_type: prev,
          };
        }
      }

      if (
        current_match.turn?.[turn.type].id !== user_id ||
        current_match.turn?.[turn.type]?.turn === false
      )
        return { turn: false };
      if (
        !current_match.turn?.[turn.type]?.id ||
        current_match.players.filter(
          (item) => item.id === current_match.turn?.[turn.type].id
        )?.length === 0
      )
        return { player_notfound: true };
      current_match.turn[turn.type].turn = false;
      current_match.turn[turn.prev_type].turn = true;
      let result = await friendsMatch.findOneAndUpdate(
        { _id: current_match._id },
        {
          turn: current_match.turn,
        }
      );
      return { match: result, turn: turn || {} };
    } catch (e) {
      console.log(e);
    }
  }

  async requestToFinish(user_id) {
    const fmm = new FriendsMatchModel();
    try {
      const match = await fmm.findFriendMatch(user_id);
      !match?.request_finish
        ? (match.request_finish = [])
        : match.request_finish;
      if (match.request_finish.includes(user_id))
        return { already_exist: true };
      match.request_finish.push(user_id);

      const result = await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { request_finish: match.request_finish },
        { new: true }
      );

      const dividedByTwoOfAllPlayers = result.players.length / 2;
      const compare =
        result.request_finish.length >= Math.ceil(dividedByTwoOfAllPlayers);
      if (compare) {
        await fmm.deleteMatch(+match.owner);
        return { matchDeleted: result };
      }
      return { match: result, request: true };
    } catch (e) {
      console.log(e);
    }
  }

  async cancelRequestToFinish(user_id) {
    try {
      const match = await new FriendsMatchModel().findFriendMatch(user_id);
      if (!match) return false;
      if (!match.request_finish.includes(user_id)) {
        return { already_canceled: true };
      }
      const requests = match.request_finish.filter((item) => item !== user_id);
      await friendsMatch.findOneAndUpdate(
        { _id: match._id },
        { request_finish: requests }
      );
      return { cancel: true, match };
    } catch (e) {
      console.log(e);
    }
  }

  async joinUserToFriendMatch(match_link, user = {}) {
    try {
      let players = await new FriendsMatchModel().getAllPlayers(match_link);
      if (players.length === 0) return { notExist: true };
      if (players.includes(user.id)) return { isExist: true };
      const match = await friendsMatch.findOne({ secret_link: match_link });
      if (match.players.length === 1) {
        match.turn.to = { ...user };
      }
      match.players.push({
        ...user,
        unique_id: customAlphabet(
          "1234567890abcdefghijklmnopqrstuvwxyzQWERTYUIOPASDFGHJKLZXCVBNM",
          12
        )(),
        // turn: true,
        date: Math.floor(Date.now() / 1000),
        hiddenMessages: [],
        limits: [],
        isOwner: false,
        admin: {
          isAdmin: false,
          notify_friends: false,
          start_game: false,
          change_game_mode: false,
          change_link: false,
          get_link: false,
          add_new_admin: false,
          remove_player: false,
          read_write_limits: false,
        },
      });

      let user_turn = { turn: false, data: {}, turn_type: "" };

      for (let i in match.turn) {
        if (
          Object.keys(match.turn[i])?.length === 0 ||
          match.players.filter((item) => item.id === match.turn[i]?.id)
            .length === 0
        ) {
          if (Object.keys(match.turn?.to)?.length > 0) {
            match.turn.to = {
              ...match.turn.to,
              payload: {},
              turn: false,
            };
          }

          match.turn[i] = {
            turn: i === "from",
            ...user,
          };

          user_turn = {
            turn: match.turn[i].turn,
            data: match.turn[i],
            turn_type: i,
          };
        }
      }

      let result = await friendsMatch.findOneAndUpdate(
        { secret_link: match_link },
        { players: match.players, turn: match.turn },
        { new: true }
      );
      return { players: match.players, joined: true, match, user_turn };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new FriendsMatchModel();
