// daily.js: everything to do with "which puzzle is it today?".
// Everyone in the world gets the same answer, because it depends only on the date.

// Day 1 of the game. Change this to the real launch date before going live.
export const LAUNCH_DATE = "2026-11-11";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Which day of the game is it? Day 1 is the launch day.
// UTC is used so the day changes at the same moment for every player.
export function dayNumber(now = new Date()) {
  const launch = Date.parse(LAUNCH_DATE + "T00:00:00Z");
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - launch) / MS_PER_DAY) + 1;
}

// Today's entry from the schedule. Day 1 is entry 0, day 2 is entry 1, and so on.
// When the list runs out it starts again from the beginning.
export function puzzleForDay(list, day = dayNumber()) {
  if (list.length === 0) throw new Error("The puzzle list is empty.");
  const index = ((day - 1) % list.length + list.length) % list.length;
  return list[index];
}

// A seeded random number generator (called "mulberry32").
// The same seed always gives the same sequence of numbers between 0 and 1,
// so any randomness in today's puzzle is identical for every player.
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
