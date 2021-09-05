const { Keyboard } = require("grammy");

const settingKeyboard = new Keyboard()
  .text("مشاهده تنظیمات فعلی")
  .text("بازگشت")
  .row()
  .text("انتخاب جنسیت")
  .text("نمایش پروفایل برای بازیکنان")
  .row();

module.exports = settingKeyboard;
