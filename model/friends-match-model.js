const { customAlphabet } = require("nanoid");
const friendsMatch = require("../schema/friends-match-schema");

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
    await friendsMatch.findOneAndUpdate(
      { _id: access.match._id },
      { mode: newMode }
    );
    return { mode: newMode, access, isOwner: +access.match.owner === user_id };
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
        { players: match.players, turn: match.turn }
      );
      return { players: match.players, joined: true };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new FriendsMatchModel();
