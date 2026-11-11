// storage.js: remembers today's answers in this browser, so a reload carries on
// where you left off and you can't replay today. If storage is blocked
// (for example, in some private windows), the game still works without it.

const keyFor = (day) => `fossil-or-phoney:day:${day}`;

export function loadDay(day) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(day)));
    return Array.isArray(saved?.answers) ? saved.answers : [];
  } catch {
    return [];
  }
}

export function saveDay(day, answers) {
  try {
    localStorage.setItem(keyFor(day), JSON.stringify({ answers }));
  } catch {
    // Storage unavailable: nothing to do.
  }
}
