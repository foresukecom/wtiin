// @ts-check
const { test, expect } = require('./fixtures');

test('現在時刻を4つの形式で表示する', async ({ openPopup }) => {
  const popup = await openPopup(new Date('2026-11-27T01:02:03Z'));

  await expect(popup.locator('#timeJST')).toHaveText('2026/11/27 10:02:03');
  await expect(popup.locator('#timeUTC')).toHaveText('2026/11/27 01:02:03');
  await expect(popup.locator('#timeUnix')).toHaveText('1795741323');
  await expect(popup.locator('#timeWareki')).toHaveText('令和8年');
});

test('表示は1秒ごとに更新される', async ({ openPopup }) => {
  const popup = await openPopup();
  const unix = popup.locator('#timeUnix');
  const first = Number(await unix.textContent());
  await expect(async () => {
    expect(Number(await unix.textContent())).toBeGreaterThan(first);
  }).toPass({ timeout: 3000 });
});

test.describe('和暦', () => {
  test('改元前は平成で表示する', async ({ openPopup }) => {
    const popup = await openPopup(new Date('2019-04-30T03:00:00Z'));
    await expect(popup.locator('#timeWareki')).toHaveText('平成31年');
  });

  test('令和の最初の年は元年と表示する', async ({ openPopup }) => {
    const popup = await openPopup(new Date('2019-05-01T03:00:00Z'));
    await expect(popup.locator('#timeWareki')).toHaveText('令和元年');
  });
});

test.describe('PCのタイムゾーンがUTCのとき', () => {
  test.use({ timezoneId: 'UTC' });

  test('和暦の年は日本時間で数える', async ({ openPopup }) => {
    // 日本時間では2027年1月1日、UTCではまだ2026年12月31日
    const popup = await openPopup(new Date('2026-12-31T15:00:00Z'));
    await expect(popup.locator('#timeJST')).toHaveText('2027/01/01 00:00:00');
    await expect(popup.locator('#timeWareki')).toHaveText('令和9年');
  });
});

test('秒が切り替わったらすぐに表示を更新する', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  // 秒の切り替わりの 0.9 秒前に開き、切り替わりの直後（0.95 秒後）まで進める
  // 実時間の経過で時計が進まないよう、止めた状態で開く
  await popup.clock.install({ time: new Date('2026-11-27T01:02:03.000Z') });
  await popup.clock.pauseAt(new Date('2026-11-27T01:02:03.100Z'));
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('#timeUTC')).toHaveText('2026/11/27 01:02:03');
  await popup.clock.runFor(950);
  await expect(popup.locator('#timeUTC')).toHaveText('2026/11/27 01:02:04', { timeout: 500 });
});

test.describe('クリックでコピー', () => {
  const copied = (popup) => popup.evaluate(() => window.copied);

  test('行をクリックすると、その時刻をコピーする', async ({ openPopup }) => {
    const popup = await openPopup(new Date('2026-11-27T01:02:03Z'));

    await popup.getByRole('row', { name: /UnixTime/ }).click();
    expect(await copied(popup)).toEqual(['1795741323']);
    await expect(popup.locator('#copyStatus')).toHaveText('UnixTime をコピーしました: 1795741323');

    await popup.getByRole('row', { name: /UTC/ }).click();
    expect(await copied(popup)).toEqual(['1795741323', '2026/11/27 01:02:03']);
  });

  test('キーボードの Enter でもコピーできる', async ({ openPopup }) => {
    const popup = await openPopup(new Date('2026-11-27T01:02:03Z'));

    await popup.getByRole('row', { name: /和暦/ }).focus();
    await popup.keyboard.press('Enter');
    expect(await copied(popup)).toEqual(['令和8年']);
  });
});

test.describe('変換', () => {
  const result = (popup) => ({
    jst: popup.locator('#convJST'),
    utc: popup.locator('#convUTC'),
    unix: popup.locator('#convUnix'),
    wareki: popup.locator('#convWareki'),
  });

  test('秒の UnixTime を変換する', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('1795741800');

    const r = result(popup);
    await expect(r.jst).toHaveText('2026/11/27 10:10:00');
    await expect(r.utc).toHaveText('2026/11/27 01:10:00');
    await expect(r.unix).toHaveText('1795741800');
    await expect(r.wareki).toHaveText('令和8年');
    await expect(popup.locator('#convertNote')).toHaveText('秒の UnixTime として変換しました');
  });

  test('13桁の UnixTime はミリ秒として変換する', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('1795741800123');

    await expect(result(popup).jst).toHaveText('2026/11/27 10:10:00');
    await expect(popup.locator('#convertNote')).toHaveText('ミリ秒の UnixTime として変換しました');
  });

  test('タイムゾーンの指定がない日時は日本時間として変換する', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('2026/11/27 10:10');

    await expect(result(popup).utc).toHaveText('2026/11/27 01:10:00');
    await expect(result(popup).unix).toHaveText('1795741800');
  });

  test('タイムゾーンの指定がある ISO 8601 の日時を変換する', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('2026-11-27T01:10:00Z');
    await expect(result(popup).jst).toHaveText('2026/11/27 10:10:00');

    await popup.locator('#convertInput').fill('2026-11-27T10:10:00+09:00');
    await expect(result(popup).unix).toHaveText('1795741800');
  });

  test('変換できない入力では結果を隠して、入力例を示す', async ({ openPopup }) => {
    const popup = await openPopup();
    for (const text of ['あした', '2026-02-30', '2026-11-27 25:00']) {
      await popup.locator('#convertInput').fill(text);
      await expect(popup.locator('#convertResult')).toBeHidden();
      await expect(popup.locator('#convertNote')).toHaveText(/変換できませんでした/);
    }
  });

  test('変換結果の行もクリックでコピーできる', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('1795741800');
    await popup.locator('#convertResult').getByRole('row', { name: /JST/ }).click();
    expect(await popup.evaluate(() => window.copied)).toEqual(['2026/11/27 10:10:00']);
  });
});

test.describe('PCのタイムゾーンがUTCのときの変換', () => {
  test.use({ timezoneId: 'UTC' });

  test('タイムゾーンの指定がない日時は、PCの設定に関係なく日本時間として扱う', async ({ openPopup }) => {
    const popup = await openPopup();
    await popup.locator('#convertInput').fill('2026-11-27 10:10');
    await expect(popup.locator('#convUnix')).toHaveText('1795741800');
  });
});
