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
    try {
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
    } catch (e) {
      return { failed: true };
    }
  }

  async sendRequest(user_id, target_id) {
    try {
      const getUser = await user.findOne({ user_id: target_id });
      !getUser.requests ? (getUser.requests = []) : getUser.requests;
      let index = getUser.requests.findIndex((item) => item === user_id);
      if (index !== -1) return false;
      getUser.requests.push(user_id);
      await user.findOneAndUpdate(
        { user_id: target_id },
        { requests: getUser.requests }
      );
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async inviteToGame(user_id, target = { user_id: "", match_id: "" }) {
    try {
      const current_user = await user.findOne({ user_id });
      !current_user?.invite_game
        ? (current_user.invite_game = [])
        : current_user.invite_game;
      let index = current_user.invite_game.findIndex(
        (item) =>
          item.user_id === target.user_id &&
          item.match_id.toString() === target.match_id.toString()
      );
      if (index >= 0) return { already_sended: true };
      current_user.invite_game.push(target);
      await user.findOneAndUpdate(
        { user_id },
        {
          invite_game: current_user.invite_game,
        },
        { new: true }
      );
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async rejectInvite(user_id, target_id) {
    try {
      const current_user = await user.findOne({ user_id });
      const index = current_user.invite_game.findIndex(
        (item) => item.user_id === target_id
      );
      if (index === -1) return { not_found: true };
      const invite_game = current_user.invite_game.filter(
        (item) => item.user_id !== target_id
      );
      await user.findOneAndUpdate(
        { user_id },
        {
          invite_game,
        },
        { new: true }
      );
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async acceptRequest(user_id, target_id) {
    try {
      const getUser = await user.findOne({ user_id });
      if (getUser.requests?.length === 0) return false;
      if (!getUser.requests.includes(target_id)) return false;
      let result = await new UserModel().addUserFriend(user_id, target_id);
      if (!result) return false;
      getUser.requests = getUser.requests.filter((item) => item !== target_id);
      await user.findOneAndUpdate(
        { user_id },
        { requests: getUser.requests ?? [] }
      );
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async rejectRequest(user_id, target_id) {
    try {
      const getUser = await user.findOne({ user_id });
      !getUser.requests ? (getUser.requests = []) : getUser.requests;
      let targetExist = getUser.requests.includes(target_id);
      // console.log(user_id,target_id)
      // if (!targetExist) return false;
      getUser.requests = getUser.requests.filter((item) => item !== target_id);
      await user.findOneAndUpdate(
        { user_id },
        { requests: getUser.requests ?? [] }
      );
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async removeFriend(user_id, friend_id) {
    try {
      const getUser = await user.findOne({ user_id });
      const getTarget = await user.findOne({ user_id: friend_id });
      const friends = getUser.friends.filter((item) => item !== friend_id);
      const targetFriends = getTarget.friends.filter(
        (item) => item !== user_id
      );
      if (!getUser.friends.filter((item) => item === friend_id)[0])
        return { not_exist: true };
      await user.findOneAndUpdate({ user_id }, { friends });
      await user.findOneAndUpdate(
        { user_id: friend_id },
        { friends: targetFriends }
      );
      return { user_id, friend_id };
    } catch (e) {
      console.log(e);
    }
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

  async getUserReports(user_id) {
    try {
      const current_user = await user.findOne({ user_id });
      return (
        current_user?.reports?.map((item) => {
          return item.user_id;
        }) || []
      );
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
      await user.findOneAndUpdate({ user_id }, { reports: userFinded.reports });
      return { report: true };
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = new UserModel();
