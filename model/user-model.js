const user = require("../schema/user-schema");

class UserModel {
  newuser(data) {
    user.findOne({ user_id: data.user_id }, (err, d) => {
      if (err) return console.log(err);
      if (!d) {
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

  async addReport(user_id, report = { user_id: 0, message: "" }) {
    try {
      const userFinded = user.findOne({ user_id });
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
