const user = require("../schema/user-schema");

class UserModel {
  newuser(data) {
    user.find({ user_id: data.user_id }, (err, data) => {
      if (err) return console.log(err);
      if (data.length === 0) {
        user.create(data, (err, result) => {
          if (err) console.log(err);
        });
      }
    });
  }
  async viewUserSetting(user_id) {
    try {
      let data = await user.find({ user_id }).select("-_id");
      return data[0];
    } catch (e) {}
  }
  async visibleUserProfile(user_id) {
    try {
      let { visible_profile } = await new UserModel().viewUserSetting(user_id);
      let updateVisibleProfile = await user.findOneAndUpdate(
        { user_id },
        { visible_profile: !visible_profile }
      );
      return updateVisibleProfile.visible_profile;
    } catch (e) {
      console.log(e);
    }
  }
  async selectGenderUser(user_id, gender) {
    try {
      await user.findOneAndUpdate({ user_id }, { sex: gender });
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new UserModel();
