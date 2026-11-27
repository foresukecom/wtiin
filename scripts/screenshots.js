// ストア用スクリーンショット（1280x800）を store/ に作成する。
// 拡張機能を読み込んだ Chromium でポップアップを撮影し、スライド風のページに拡大して載せる
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { launchWithExtension } = require('./extension');

const storeDir = path.join(__dirname, '..', 'store');
const template = fs.readFileSync(path.join(storeDir, 'slide.html'), 'utf8');

// アイコンの針と同じ、日本時間の10時10分に固定して撮る
const SHOT_TIME = new Date('2026-11-27T01:10:00Z');

// highlight: 強調するポップアップの行（tdのid）
// copy: クリックしてコピーする行（tdのid）、convert: 変換欄に入力する値
// part: 'clock' は現在時刻の表まで、'convert' は変換欄だけ、'all' はポップアップ全体を切り出す
const shots = [
  {
    file: 'screenshot-1.png',
    highlight: [],
    part: 'clock',
    eyebrow: 'WHAT TIME IS IT NOW?',
    title: 'いまの時刻を、<br>4つの形式で。',
    body: 'ツールバーのボタンを押すだけで、<br>日本時間・UTC・UnixTime・和暦を<br>まとめて表示します。',
  },
  {
    file: 'screenshot-2.png',
    highlight: ['timeUnix'],
    copy: 'timeUnix',
    part: 'clock',
    eyebrow: 'クリックでコピー',
    title: '行をクリックすれば、<br>そのまま貼り付け。',
    body: 'UnixTimeもUTCも、クリックひとつで<br>クリップボードへ。<br>ログの検索やチケットへの記入に。',
  },
  {
    file: 'screenshot-3.png',
    highlight: ['timeWareki'],
    part: 'clock',
    eyebrow: '和暦もひと目で',
    title: '今年は令和何年？<br>にもすぐ答えます。',
    body: '書類に和暦を書くときも、ボタンひとつ。<br>日本時間で数えるので、年明けもずれません。',
  },
  {
    file: 'screenshot-4.png',
    highlight: [],
    convert: '1795741800123',
    part: 'convert',
    eyebrow: '開発や運用のおともに',
    title: 'ログの時刻を、<br>貼るだけで変換。',
    body: 'UnixTime（秒・ミリ秒）や日時を<br>貼り付けると、日本時間・UTC・<br>和暦に変換します。',
  },
];

// ポップアップは拡大して載せるため、2倍の解像度で撮っておく
async function capturePopup(context, extensionId, shot) {
  const page = await context.newPage();
  // 撮影でPCのクリップボードを書き換えないよう、コピーは何もしないようにする
  await page.addInitScript(() => {
    navigator.clipboard.writeText = async () => {};
  });
  await page.clock.setFixedTime(SHOT_TIME);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.evaluate((ids) => {
    for (const id of ids) {
      const row = document.getElementById(id).parentElement;
      row.style.background = '#fff3c4';
      row.style.fontWeight = 'bold';
    }
  }, shot.highlight);
  if (shot.copy) {
    await page.locator(`#${shot.copy}`).click();
    await page.mouse.move(0, 0);
  }
  if (shot.convert) {
    await page.locator('#convertInput').fill(shot.convert);
  }

  const [top, bottom] = {
    clock: ['h2', '#copyStatus'],
    convert: ['h3', '#convertResult'],
    all: ['h2', '#convertResult'],
  }[shot.part];
  const topBox = await page.locator(top).boundingBox();
  const bottomBox = await page.locator(bottom).boundingBox();
  // 変換欄は、見出しの上の区切り線を含めない
  const y = shot.part === 'convert' ? Math.ceil(topBox.y + 2) : Math.max(0, Math.floor(topBox.y - 14));
  const height = Math.ceil(bottomBox.y + bottomBox.height + 14) - y;
  const image = await page.screenshot({ clip: { x: 0, y, width: 320, height } });
  await page.close();
  return image.toString('base64');
}

function renderSlide(shot, index, popup) {
  return template
    .replaceAll('{{title}}', shot.title)
    .replace('{{eyebrow}}', shot.eyebrow)
    .replace('{{body}}', shot.body)
    .replace('{{page}}', `${index + 1} / ${shots.length}`)
    .replace('{{popup}}', popup)
    .replace('{{popupWidth}}', String(320 * 1.6));
}

async function main() {
  const { context, extensionId } = await launchWithExtension({ deviceScaleFactor: 2 });
  const browser = await chromium.launch({ channel: 'chromium' });
  const slidePage = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

  for (const [index, shot] of shots.entries()) {
    const popup = await capturePopup(context, extensionId, shot);
    await slidePage.setContent(renderSlide(shot, index, popup));
    const out = path.join(storeDir, shot.file);
    await slidePage.screenshot({ path: out });
    console.log(`${path.relative(process.cwd(), out)} を作成しました`);
  }

  // README に載せる、変換欄まで含めたポップアップ全体の画像
  const readmeImage = path.join(__dirname, '..', 'images', 'popup.png');
  const popup = await capturePopup(context, extensionId, { highlight: [], convert: '1795741800123', part: 'all' });
  fs.writeFileSync(readmeImage, Buffer.from(popup, 'base64'));
  console.log(`${path.relative(process.cwd(), readmeImage)} を作成しました`);
  await browser.close();
  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
