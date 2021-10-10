const { Keyboard } = require("grammy");
const mainKeyboard = require("../keyboard/main-keyboard");
const { matchPlayingKeyboard } = require("../keyboard/match-keyboard");
const { reply } = require("./msg");

class PlayMenu {
  constructor(ctx) {
    this.ctx = ctx;
  }
  report(mode = "", cb = () => {}) {
    cb(mode);
    if (mode === "done") {
      reply(
        this.ctx,
        "گزارش ثبت شد و بازی را به اتمام رساندید به منوی اصلی برگشتید",
        mainKeyboard.keyboard
      );
    } else if (mode === "cancel") {
      reply(
        this.ctx,
        "گزارش لغو شد به منوی بازی برگشتید",
        matchPlayingKeyboard.keyboard
      );
    }
  }
  leaveGame(mode = "", cb = () => {}) {
    cb(mode);
    if (mode === "ask") {
      reply(
        this.ctx,
        `آیا اطمینان دارید؟
        اگر از بازی خارج شوید بازیکن مقابل می تواند برای شما گزارش رد کند یا شما را مسدود کند که در صورت مشاهده ده اخطار شما اجازه استفاده از ربات را ندارید `,
        new Keyboard()
          .text("بله می خواهم خارج شوم")
          .row()
          .text("خیر می خواهم ادامه دهم").keyboard
      );
    } else if (mode === "leave") {
      reply(
        this.ctx,
        "از بازی خارج شدی و به منوی اصلی بازگشتی دوست من",
        mainKeyboard.keyboard
      );
    } else if (mode === "cancel") {
      reply(
        this.ctx,
        "از بازی خارج شدی و به منوی اصلی بازگشتی دوست من",
        matchPlayingKeyboard.keyboard
      );
    }
  }
  chatPlayer(mode = "", cb = () => {}) {
    cb(mode);
    if (mode === "chat") {
      reply(
        this.ctx,
        `می توانید با بازیکن مقابل چت کنید هر زمان خواستید به منوی اصلی برگردید لطفا روی لغو گفتگو بزنید`,
        new Keyboard().text("لغو گفتگو").keyboard
      );
    } else if (mode === "cancel") {
      reply(
        this.ctx,
        `گفتگو با بازیکن لغو شد به منوی بازی برگشتید`,
        matchPlayingKeyboard.keyboard
      );
    }
  }
}

module.exports = PlayMenu;
