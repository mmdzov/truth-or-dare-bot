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
      let result = await match.find({ user_id })[0];
      return result;
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new MatchModel();
