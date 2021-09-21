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
      console.log(result);
      return { players: match.players, joined: true };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new FriendsMatchModel();
