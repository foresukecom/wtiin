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
const shots = [
  {
    file: 'screenshot-1.png',
    highlight: [],
    eyebrow: 'WHAT TIME IS IT NOW?',
    title: 'いまの時刻を、<br>4つの形式で。',
    body: 'ツールバーのボタンを押すだけで、<br>日本時間・UTC・UnixTime・和暦を<br>まとめて表示します。',
  },
  {
    file: 'screenshot-2.png',
    highlight: ['timeUTC', 'timeUnix'],
    eyebrow: '開発や運用のおともに',
    title: 'ログの時刻と、<br>すぐに照らし合わせ。',
    body: 'サーバーのログはUTC、APIの値はUnixTime。日本時間と並べて、換算せずに確かめられます。',
  },
  {
    file: 'screenshot-3.png',
    highlight: ['timeWareki'],
    eyebrow: '和暦もひと目で',
    title: '今年は令和何年？<br>にもすぐ答えます。',
    body: '書類に和暦を書くときも、ボタンひとつ。日本時間で数えるので、年明けもずれません。',
  },
];

// ポップアップは拡大して載せるため、2倍の解像度で撮っておく
async function capturePopup(context, extensionId, highlight) {
  const page = await context.newPage();
  await page.clock.setFixedTime(SHOT_TIME);
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.evaluate((ids) => {
    for (const id of ids) {
      const row = document.getElementById(id).parentElement;
      row.style.background = '#fff3c4';
      row.style.fontWeight = 'bold';
    }
  }, highlight);
  const box = await page.locator('table').boundingBox();
  const height = Math.ceil(box.y + box.height + 14);
  const image = await page.screenshot({ clip: { x: 0, y: 0, width: 320, height } });
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
    const popup = await capturePopup(context, extensionId, shot.highlight);
    await slidePage.setContent(renderSlide(shot, index, popup));
    const out = path.join(storeDir, shot.file);
    await slidePage.screenshot({ path: out });
    console.log(`${path.relative(process.cwd(), out)} を作成しました`);
  }
  await browser.close();
  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
