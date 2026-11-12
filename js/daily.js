// daily.js: everything to do with "which specimens are in today's game?".
// Everyone in the world gets the same answer, because it depends only on the date.

// Day 1 of the game. Change this to the real launch date before going live.
export const LAUNCH_DATE = "2026-11-11";

export const SPECIMENS_PER_DAY = 3;

// A specimen isn't used again until this many days have passed (if the pool is big enough).
const COOLDOWN_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LAUNCH_MS = Date.parse(LAUNCH_DATE + "T00:00:00Z");

// Which day of the game is it? Day 1 is the launch day.
// UTC is used so the day changes at the same moment for every player.
export function dayNumber(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - LAUNCH_MS) / MS_PER_DAY) + 1;
}

// The game day a "YYYY-MM-DD" date falls on.
export function dayNumberOfDate(isoDate) {
  return Math.floor((Date.parse(isoDate + "T00:00:00Z") - LAUNCH_MS) / MS_PER_DAY) + 1;
}

// The calendar date (UTC) of a game day, e.g. day 1 -> the launch date.
export function dateForDay(day) {
  return new Date(LAUNCH_MS + (day - 1) * MS_PER_DAY);
}

// Milliseconds until the next day starts (midnight UTC).
export function msUntilNextDay(now = new Date()) {
  const tomorrow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return tomorrow - now.getTime();
}

// A seeded random number generator (called "mulberry32").
// The same seed always gives the same sequence of numbers between 0 and 1,
// so any randomness in today's game is identical for every player.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffles a copy of a list using the seeded generator (Fisher-Yates shuffle).
function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Picks `count` specimens, preferring ones not used in the last COOLDOWN_DAYS.
// If there aren't enough fresh ones, it falls back to the ones used longest ago.
function choose(candidates, count, day, lastUsed, random) {
  const shuffled = shuffle(candidates, random);
  const isFresh = (s) => !lastUsed.has(s.id) || day - lastUsed.get(s.id) > COOLDOWN_DAYS;
  const fresh = shuffled.filter(isFresh);
  const stale = shuffled
    .filter((s) => !isFresh(s))
    .sort((a, b) => lastUsed.get(a.id) - lastUsed.get(b.id));
  return [...fresh, ...stale].slice(0, count);
}

// Each specimen has this chance of being a phoney, so about half of days have none.
const PHONEY_CHANCE = 1 / 5;

// How many phoneys today: each of the day's slots rolls separately, capped at 2.
function phoneyCount(random) {
  let count = 0;
  for (let i = 0; i < SPECIMENS_PER_DAY; i++) if (random() < PHONEY_CHANCE) count++;
  return Math.min(count, 2);
}

// The specimens for one day, given what's been used recently.
function pickForOneDay(allSpecimens, day, lastUsed) {
  // Only specimens that had been added by that day, so adding new ones never changes past days.
  const pool = allSpecimens
    .filter((s) => dayNumberOfDate(s.added) <= day)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const random = seededRandom(Math.imul(day, 2654435761));

  const fossils = pool.filter((s) => s.kind === "fossil");
  const phoneys = pool.filter((s) => s.kind === "phoney");

  let numPhoneys = Math.min(phoneyCount(random), phoneys.length);
  let numFossils = Math.min(SPECIMENS_PER_DAY - numPhoneys, fossils.length);
  numPhoneys = Math.min(SPECIMENS_PER_DAY - numFossils, phoneys.length);

  const picks = [
    ...choose(fossils, numFossils, day, lastUsed, random),
    ...choose(phoneys, numPhoneys, day, lastUsed, random),
  ];
  return shuffle(picks, random);
}

// Today's specimens. It replays every day from launch so that "recently used"
// is worked out exactly the same way for everyone. That takes a few
// milliseconds even after years of puzzles.
export function specimensForDay(allSpecimens, day = dayNumber()) {
  if (day < 1) return [];
  const lastUsed = new Map();
  let picks = [];
  for (let d = 1; d <= day; d++) {
    picks = pickForOneDay(allSpecimens, d, lastUsed);
    for (const s of picks) lastUsed.set(s.id, d);
  }
  return picks;
}
