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
      const owner = await friendsMatch.findOne({ owner: user_id });
      if (owner) {
        await friendsMatch.findOneAndDelete({ owner: user_id });
      }
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
        turn.from.payload = data;
      } else if (turn?.to?.id === user_id) {
        if (typeof turn?.to?.turn === "undefined") return;
        turn.to.payload = data;
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
        turn: true,
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

      let result = await friendsMatch.findOneAndUpdate(
        { secret_link: match_link },
        { players: match.players, turn: match.turn },
        { new: true }
      );
      return { players: match.players, joined: true, match };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new FriendsMatchModel();
