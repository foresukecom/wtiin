// @ts-check
const { test, expect } = require('./fixtures');

test('現在時刻を4つの形式で表示する', async ({ openPopup }) => {
  const popup = await openPopup(new Date('2026-11-27T01:02:03Z'));

  await expect(popup.locator('#timeJST')).toHaveText('2026/11/27 10:02:03');
  await expect(popup.locator('#timeUTC')).toHaveText('2026/11/27 01:02:03');
  await expect(popup.locator('#timeUnix')).toHaveText('1795741323');
  await expect(popup.locator('#timeWareki')).toHaveText('令和 8年');
});

test('表示は1秒ごとに更新される', async ({ openPopup }) => {
  const popup = await openPopup();
  const unix = popup.locator('#timeUnix');
  const first = Number(await unix.textContent());
  await expect(async () => {
    expect(Number(await unix.textContent())).toBeGreaterThan(first);
  }).toPass({ timeout: 3000 });
});
