// leaderboard.js: a leaderboard with no server of our own.
//
// - Scores are sent to a Google Form (the form's responses fill a Google Sheet).
// - The Sheet's responses tab is published to the web as a CSV, which the game
//   reads to draw the boards. Google refreshes that CSV every few minutes, so new
//   scores take a little while to show up (your own shows straight away).
// - Nothing stops someone sending a fake score, so the boards skip anything that
//   doesn't look right, and only count each player's first score of each day.
//   Junk can be deleted from the Sheet by hand.

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfM5Pb8yxNARRHtmtOoa5yYrejEV-PB2IXYwaxLfSnIQDKA_w/formResponse";
const FIELDS = { day: "entry.1759467429", player: "entry.26074175", name: "entry.1670934626", points: "entry.1190681836", emojis: "entry.1833043684" };
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTb5ivxvhQ3Vq5MHS3gQyWg6KmJryPa-7V6A248QT2YchM9x7kQ7j0h72H2ZYcuI0wYyVE14uWRzDpW/pub?gid=47602262&single=true&output=csv";

const MAX_DAILY_POINTS = 300;
const KEY = "fossil-or-phoney:";

// ---------- Small storage helpers (the game still works if storage is blocked) ----------

function read(key) {
  try { return localStorage.getItem(KEY + key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(KEY + key, value); } catch { /* storage unavailable */ }
}

// A random ID for this device, so one player's scores can be grouped together.
export function playerId() {
  let id = read("player-id");
  if (!id || !/^[a-z0-9-]{8,40}$/.test(id)) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    write("player-id", id);
  }
  return id;
}

export const savedNickname = () => read("nickname") || "";

// What this device already sent for a day, or null.
export function submission(day) {
  try { return JSON.parse(read(`submitted:${day}`)); } catch { return null; }
}

// ---------- Nicknames ----------

// Not allowed anywhere in a nickname, even run together with other letters.
const BLOCKED_STEMS = ["fuck", "fuk", "fck", "fack","shit", "cunt", "bitch", "nigg", "faggot", "slut", "whore", "nazi", "hitler", "penis", "vagina", "pussy", "wank", "twat", "porn", "retard"];
// Only blocked as whole words, because they hide inside innocent words
// (grape, Essex, Dickinsonia, peacock).
const BLOCKED_WORDS = ["rape", "sex", "dick", "cock", "fag", "kkk", "ass", "arse", "tit", "tits", "cum"];

// Tidies a nickname, or returns "" if it isn't allowed.
export function cleanNickname(raw) {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z0-9 _.'-]{2,16}$/.test(name)) return "";
  // Undo common number-for-letter swaps before checking.
  const plain = name.toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
  const squashed = plain.replace(/[^a-z]/g, "");
  const words = plain.split(/[^a-z]+/);
  if (BLOCKED_STEMS.some((stem) => squashed.includes(stem))) return "";
  if (words.some((word) => BLOCKED_WORDS.includes(word))) return "";
  return name;
}

// ---------- Sending a score ----------

export async function submitScore(day, nickname, points, emojis) {
  const name = cleanNickname(nickname);
  if (!name) throw new Error("Nicknames need 2 to 16 letters or numbers, and nothing rude.");
  const body = new URLSearchParams({
    [FIELDS.day]: String(day),
    [FIELDS.player]: playerId(),
    [FIELDS.name]: name,
    [FIELDS.points]: String(points),
    [FIELDS.emojis]: emojis.join(""),
  });
  // Google Forms doesn't allow reading its reply from another site ("no-cors"),
  // so a network failure is the only error we can see.
  await fetch(FORM_URL, { method: "POST", mode: "no-cors", body });
  write("nickname", name);
  const sent = { name, points, emojis: emojis.join("") };
  write(`submitted:${day}`, JSON.stringify(sent));
  return sent;
}

// ---------- Reading the boards ----------

// Splits CSV text into rows of cells (handles quotes, commas and line breaks in cells).
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Every believable score, oldest first, keeping only each player's first score per day.
async function loadScores(today) {
  const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let text = await response.text();
  // Google sometimes serves an older copy of the CSV for a while. Scores are only
  // ever added, so if a copy we saw in the last 15 minutes has more rows, use that.
  // (After that it's forgotten, so rows deleted from the Sheet by hand disappear.)
  let remembered = null;
  try { remembered = JSON.parse(read("board-csv")); } catch { /* ignore */ }
  const lines = (csv) => csv.split("\n").length;
  if (remembered && Date.now() - remembered.at < 15 * 60 * 1000 && lines(remembered.text) > lines(text)) {
    text = remembered.text;
  } else {
    write("board-csv", JSON.stringify({ at: Date.now(), text }));
  }
  const [header = [], ...rows] = parseCsv(text);
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const at = { day: col("day"), player: col("player id"), name: col("nickname"), points: col("points"), emojis: col("emojis") };

  const seen = new Set();
  const scores = [];
  for (const row of rows) {
    const day = Number(row[at.day]);
    const points = Number(row[at.points]);
    const player = String(row[at.player] ?? "").trim();
    const name = cleanNickname(row[at.name]);
    if (!Number.isInteger(day) || day < 1 || day > today) continue;
    if (!Number.isInteger(points) || points < 0 || points > MAX_DAILY_POINTS) continue;
    if (!/^[a-z0-9-]{8,40}$/.test(player) || !name) continue;
    const key = `${player}:${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scores.push({ day, points, player, name, emojis: String(row[at.emojis] ?? "").slice(0, 40) });
  }
  return scores;
}

// Builds both boards. Your own score from this device is added if the CSV
// hasn't caught up yet. Ties go to whoever finished first.
export async function loadBoards(today) {
  const scores = await loadScores(today);
  const me = playerId();
  const mine = submission(today);
  if (mine && !scores.some((s) => s.player === me && s.day === today)) {
    scores.push({ day: today, points: mine.points, player: me, name: mine.name, emojis: mine.emojis, pending: true });
  }

  const todayBoard = scores.filter((s) => s.day === today).sort((a, b) => b.points - a.points);

  const totals = new Map();
  for (const s of scores) {
    const t = totals.get(s.player) ?? { player: s.player, points: 0, days: 0, name: s.name };
    t.points += s.points;
    t.days += 1;
    t.name = s.name; // the latest nickname they used
    totals.set(s.player, t);
  }
  const allTime = [...totals.values()].sort((a, b) => b.points - a.points);
  return { today: todayBoard, allTime, me };
}
