// @ts-check
const { test: base } = require('@playwright/test');
const { launchWithExtension } = require('../scripts/extension');

// `just test` が先にビルドした dist/extension/ を読み込む
const test = base.extend({
  // PCのタイムゾーンは test.use({ timezoneId }) で変えられる
  launched: async ({ timezoneId }, use) => {
    const launched = await launchWithExtension(timezoneId ? { timezoneId } : {});
    await use(launched);
    await launched.context.close();
  },
  context: async ({ launched }, use) => {
    await use(launched.context);
  },
  extensionId: async ({ launched }, use) => {
    await use(launched.extensionId);
  },
  // ポップアップを通常のタブとして開く。時刻は各テストで固定してから開けるよう、関数で渡す
  openPopup: async ({ context, extensionId }, use) => {
    await use(async (time) => {
      const popup = await context.newPage();
      if (time) {
        await popup.clock.setFixedTime(time);
      }
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      return popup;
    });
  },
});

module.exports = { test, expect: test.expect };
