const defaultSession = {
  friend_game: {
    new_game: true, //! default false
    change_link: false,
    page: {
      index: 0,
    },
    chat: {
      hasTurn: false,
      chat: false,
    }, //! default false
    new_game_select_name: {},
    promote: {
      user_id: 1820867140, //! default 0
      isAdmin: false,
      notify_friends: false,
      start_game: false,
      change_game_mode: false,
      change_link: false,
      get_link: false,
      add_new_admin: false,
      remove_player: false,
      read_write_limits: false,
      limit_player: false,
    },
  },
  process: {
    players_chat: false,
    player_chat: false,
    report_player: false,
    report_game: false,
    leave_game: false,
  },
  select: undefined,
  waitForAddFriend: false,
  selectGender: false,
  chat: {
    hasTurn: false,
    chat: false,
  },
  privateChat: {},
  waitForFindPlayer: false,
  selectTargetGender: false,
  findPlayer: false,
  report_message: {},
  player: {
    report: false,
    report_message: {},
    inGame: false,
    truthOrDare: {
      truth: false,
      dare: false,
    },
    leave_game: false,
    chat: false,
    count_players: 0,
    limitInPerTurn: 0,
    sended: false,
    prevent_touch: false,
  },
  otherPlayer: {
    truthOrDare: {
      truth: false,
      dare: false,
    },
    done: false,
  },
};

module.exports = defaultSession;
