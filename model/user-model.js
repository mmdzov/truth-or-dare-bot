const user = require("../schema/user-schema");

class UserModel {
  async newuser(data) {
    if (data?.user_id) {
      let player = await user.findOne({ user_id: data?.user_id });
      if (!player?.user_unique_id) {
        user.create(data, (err, result) => {
          if (err) console.log(err);
        });
      }
    }
  }

  async viewUserSetting(user_id) {
    try {
      let data = await user.find({ user_id }).select("-_id");
      return data[0];
    } catch (e) {}
  }

  async addUserFriend(user_id, target_id) {
    let player = await user.findOne({ user_id });
    if (user_id === target_id) return { isEqual: true };
    if (!player?.friends) player.friends = [];
    if (player.friends?.includes(target_id)) return { isExist: true };
    let target_player = await user.findOne({ user_id: target_id });
    if (!target_player) return { not_found: true };
    if (!player.friends) player.friends = [];
    target_player.friends.push(user_id);
    player.friends.push(target_id);
    await user.findOneAndUpdate({ user_id }, { friends: player.friends });
    await user.findOneAndUpdate(
      { user_id: target_id },
      { friends: target_player.friends }
    );
    return true;
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

  async getUserFriends(user_id) {
    try {
      let { friends } = await user.findOne({ user_id });
      return friends;
    } catch (e) {
      console.log(e);
    }
  }

  async addReport(user_id, report = { user_id: 0, message: "" }) {
    try {
      const userFinded = await user.findOne({ user_id });
      if (!userFinded?.reports) userFinded.reports = [];
      let beforeExist =
        userFinded.reports.filter((item) => item.user_id === report.user_id)
          .length > 0;
      if (beforeExist) return { alreadyReported: true };
      userFinded.reports.push(report);
      await findOneAndUpdate({ user_id }, { reports: userFinded.reports });
      return { report: true };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new UserModel();
