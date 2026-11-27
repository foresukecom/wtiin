// 日時を「年/月/日 時:分:秒」（24時間表記）で表示する形式
function dateTimeFormat(timeZone) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

const jstFormat = dateTimeFormat("Asia/Tokyo");
const utcFormat = dateTimeFormat("UTC");
// 和暦カレンダーで元号と年を出す。改元や元年の表記もブラウザが扱う
const warekiFormat = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
  timeZone: "Asia/Tokyo",
  era: "long",
  year: "numeric"
});

function updateTime() {
  const now = new Date();

  // JST (日本標準時) と UTC (世界標準時)
  document.getElementById("timeJST").textContent = jstFormat.format(now);
  document.getElementById("timeUTC").textContent = utcFormat.format(now);

  // UnixTime（秒単位）
  const unixTime = Math.floor(now.getTime() / 1000);
  document.getElementById("timeUnix").textContent = unixTime;

  // 和暦（日本時間で数える）
  document.getElementById("timeWareki").textContent = warekiFormat.format(now);
}

// ポップアップ表示時に即時更新し、1秒ごとに自動更新
updateTime();
setInterval(updateTime, 1000);
