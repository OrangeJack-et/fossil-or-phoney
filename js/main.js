// main.js: connects the daily puzzle to the page.
import { dayNumber, puzzleForDay } from "./daily.js";

async function loadFossils() {
  const response = await fetch("data/fossils.json");
  if (!response.ok) throw new Error(`Could not load fossils (HTTP ${response.status}).`);
  const data = await response.json();
  return data.fossils;
}

async function start() {
  const label = document.getElementById("puzzle-number");
  const day = dayNumber();

  if (day < 1) {
    label.textContent = "The first fossil arrives soon.";
    return;
  }

  try {
    const fossils = await loadFossils();
    const today = puzzleForDay(fossils, day);
    label.textContent = `Puzzle #${day}`;
    // Gameplay will use `today` here. Not shown yet, so the answer isn't spoiled.
    console.debug("Today's fossil id:", today.id);
  } catch (error) {
    label.textContent = `Puzzle #${day}`;
    console.error(error);
  }
}

start();
