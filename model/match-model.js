const match = require("../schema/match-schema");

class MatchModel {
  async newMatch(data) {
    try {
      let result = await match.create(data);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new MatchModel();
