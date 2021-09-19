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
