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
// 和暦カレンダーで「令和8年11月27日」のように出す。改元や元年の表記もブラウザが扱う
const warekiDateFormat = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
  timeZone: "Asia/Tokyo",
  era: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
});
const weekdayFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  weekday: "short"
});

// 書類などにそのまま書けるよう、曜日を全角の括弧で付ける。例: 令和8年11月27日（金）
function formatWareki(date) {
  return `${warekiDateFormat.format(date)}（${weekdayFormat.format(date)}）`;
}

// 4つの形式の値を、id が prefix + JST / UTC / Unix / Wareki の要素に表示する
function showValues(prefix, date) {
  // JST (日本標準時) と UTC (世界標準時)
  document.getElementById(`${prefix}JST`).textContent = jstFormat.format(date);
  document.getElementById(`${prefix}UTC`).textContent = utcFormat.format(date);

  // UnixTime（秒単位）
  document.getElementById(`${prefix}Unix`).textContent = Math.floor(date.getTime() / 1000);

  // 和暦（日本時間で数える）
  document.getElementById(`${prefix}Wareki`).textContent = formatWareki(date);
}

function updateTime() {
  showValues("time", new Date());
}

// ポップアップ表示時に即時更新し、以降は秒が切り替わるたびに更新する。
// 開いた時刻を起点に1秒ごとに更新すると、表示が最大1秒近く遅れるため
function scheduleUpdate() {
  setTimeout(() => {
    updateTime();
    scheduleUpdate();
  }, 1000 - (Date.now() % 1000));
}

updateTime();
scheduleUpdate();

// 行をクリック（または Enter / Space）すると、その時刻をクリップボードにコピーする
const copyStatus = document.getElementById("copyStatus");
const copyHint = copyStatus.textContent;
let copyStatusTimer = null;

function showCopyStatus(message, done) {
  copyStatus.textContent = message;
  copyStatus.classList.toggle("done", done);
  clearTimeout(copyStatusTimer);
  copyStatusTimer = setTimeout(() => {
    copyStatus.textContent = copyHint;
    copyStatus.classList.remove("done");
  }, 2000);
}

function copyRow(row) {
  const value = row.lastElementChild.textContent;
  navigator.clipboard.writeText(value).then(
    () => showCopyStatus(`${row.dataset.label} をコピーしました: ${value}`, true),
    () => showCopyStatus("コピーできませんでした", false)
  );
}

document.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-label]");
  if (row) {
    copyRow(row);
  }
});

document.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-label]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    copyRow(row);
  }
});

// 入力された UnixTime や日時を、4つの形式に変換する
const convertInput = document.getElementById("convertInput");
const convertNote = document.getElementById("convertNote");
const convertResult = document.getElementById("convertResult");
const convertHint = convertNote.textContent;

// UnixTime がこの値以上ならミリ秒とみなす（秒だとすると西暦5138年になる）
const MILLISECONDS_THRESHOLD = 1e11;
const UNIX_TIME_PATTERN = /^-?\d+$/;
// タイムゾーンの指定がない日時。2026-11-27 10:10、2026/11/27 など
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
// タイムゾーンの指定がある ISO 8601 の日時。2026-11-27T01:10:00Z、2026-11-27T10:10:00+09:00 など
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

// 変換できたら { date, note } を、できなければ null を返す
function parseInput(text) {
  if (UNIX_TIME_PATTERN.test(text)) {
    const value = Number(text);
    if (Math.abs(value) >= MILLISECONDS_THRESHOLD) {
      return { date: new Date(value), note: "ミリ秒の UnixTime として変換しました" };
    }
    return { date: new Date(value * 1000), note: "秒の UnixTime として変換しました" };
  }

  const local = text.match(LOCAL_DATE_TIME_PATTERN);
  if (local) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = local.slice(1).map((part) => Number(part || 0));
    // 日本時間として扱う。2月30日などの存在しない日時は、組み立て直して一致しなければ無効にする
    const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second));
    const jst = new Date(date.getTime() + 9 * 3600 * 1000);
    const valid = jst.getUTCFullYear() === year && jst.getUTCMonth() === month - 1 && jst.getUTCDate() === day &&
      jst.getUTCHours() === hour && jst.getUTCMinutes() === minute && jst.getUTCSeconds() === second;
    return valid ? { date, note: "タイムゾーンの指定がないため、日本時間として変換しました" } : null;
  }

  if (ISO_DATE_TIME_PATTERN.test(text)) {
    return { date: new Date(text), note: "日時を変換しました" };
  }
  return null;
}

function convert() {
  const text = convertInput.value.trim();
  convertNote.classList.remove("error");
  if (!text) {
    convertNote.textContent = convertHint;
    convertResult.hidden = true;
    return;
  }

  const parsed = parseInput(text);
  if (!parsed || Number.isNaN(parsed.date.getTime())) {
    convertNote.textContent = "変換できませんでした。UnixTime か、2026-11-27 10:10 のような日時を入力してください";
    convertNote.classList.add("error");
    convertResult.hidden = true;
    return;
  }

  showValues("conv", parsed.date);
  convertNote.textContent = parsed.note;
  convertResult.hidden = false;
}

convertInput.addEventListener("input", convert);
