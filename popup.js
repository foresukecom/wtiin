function updateTime() {
  const now = new Date();

  // JST (日本標準時) の日時（年/月/日 時:分:秒）
  const jstOptions = {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };
  const formattedJST = new Intl.DateTimeFormat("ja-JP", jstOptions).format(now);
  document.getElementById("timeJST").textContent = formattedJST;

  // UTC (世界標準時) の日時（24時間表記）
  const utcOptions = {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };
  const formattedUTC = new Intl.DateTimeFormat("ja-JP", utcOptions).format(now);
  document.getElementById("timeUTC").textContent = formattedUTC;

  // UnixTime（秒単位）
  const unixTime = Math.floor(now.getTime() / 1000);
  document.getElementById("timeUnix").textContent = unixTime;

  // 和暦：現在が令和何年か
  // ※ 現在の日付が令和である前提として計算
  let reiwaYear;
  if (now.getFullYear() === 2019) {
    // 2019年は令和元年（※拡張が令和以降で使用される前提）
    reiwaYear = 1;
  } else {
    reiwaYear = now.getFullYear() - 2018;
  }
  document.getElementById("timeWareki").textContent = `令和 ${reiwaYear}年`;
}

// ポップアップ表示時に即時更新し、1秒ごとに自動更新
updateTime();
setInterval(updateTime, 1000);
