// main.js: runs the game on the page.
// The flow for each specimen: fossil or phoney? -> (if fossil) guess the age -> reveal.
// After the last specimen: results, a share button, and a countdown to tomorrow.

import { dayNumber, specimensForDay, msUntilNextDay } from "./daily.js";
import { positionToMya, myaToPosition, PERIODS, periodAt, formatAge, formatRange, MAX_MYA } from "./timeline.js";
import { scoreAnswer, PHONEY_TYPES } from "./scoring.js";
import { loadDay, saveDay } from "./storage.js";
import { buildShareText, copyToClipboard } from "./share.js";

const game = document.getElementById("game");
const puzzleLabel = document.getElementById("puzzle-number");

let day;
let specimens = [];
let answers = [];

// Makes text safe to put inside HTML.
function esc(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

const percent = (mya) => (myaToPosition(mya) * 100).toFixed(2);

async function start() {
  day = dayNumber();
  if (day < 1) {
    puzzleLabel.textContent = "Opening soon";
    game.innerHTML = `<section class="panel"><p>The first specimens arrive soon.</p></section>`;
    return;
  }
  puzzleLabel.textContent = `Puzzle #${day}`;

  try {
    const response = await fetch("data/specimens.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    specimens = specimensForDay(data.specimens, day);
  } catch (error) {
    console.error("Could not load specimens:", error);
    game.innerHTML = `<section class="panel"><p>Today's specimens couldn't be loaded. Try refreshing the page.</p></section>`;
    return;
  }

  answers = loadDay(day).slice(0, specimens.length);
  showNext();
}

function showNext() {
  if (answers.length >= specimens.length) showResults();
  else showSpecimen(answers.length);
}

// ---------- Photos ----------

function photoHtml(specimen) {
  if (!specimen.image) {
    return `<div class="photo placeholder" role="img" aria-label="${esc(specimen.clue)}"><span>Photo coming soon</span></div>`;
  }
  return `<canvas class="photo" data-src="${esc(specimen.image)}" role="img" aria-label="${esc(specimen.clue)}"></canvas>`;
}

// Draws the photo small, then CSS scales it up with hard edges: instant pixel art.
function pixelatePhotos() {
  for (const canvas of game.querySelectorAll("canvas[data-src]")) {
    const img = new Image();
    img.onload = () => {
      const width = 96;
      canvas.width = width;
      canvas.height = Math.round((img.height / img.width) * width);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = canvas.dataset.src;
  }
}

// ---------- One specimen ----------

function periodStripHtml() {
  return PERIODS.map((p) => {
    const width = (myaToPosition(p.end) - myaToPosition(p.start)) * 100;
    return `<span class="period" data-period="${p.name}" style="width:${width.toFixed(2)}%" title="${p.name}">${p.short}</span>`;
  }).join("");
}

function showSpecimen(index) {
  const specimen = specimens[index];
  game.innerHTML = `
    <section class="panel specimen">
      <p class="step">Specimen ${index + 1} of ${specimens.length}</p>
      ${photoHtml(specimen)}
      <p class="clue">${esc(specimen.clue)}</p>
      <p class="found"><span>Found:</span> ${esc(specimen.foundIn)}</p>

      <p class="question">Real fossil, or phoney?</p>
      <div class="choice">
        <button class="btn" type="button" data-call="fossil" aria-pressed="false">🦴 Fossil</button>
        <button class="btn btn-alt" type="button" data-call="phoney">🎭 Phoney</button>
      </div>

      <div class="guess" hidden>
        <label for="age-slider" class="question">How long ago did it live?</label>
        <p class="age-readout" id="age-readout" aria-live="polite"></p>
        <input type="range" id="age-slider" min="0" max="1000" step="1" value="500">
        <div class="periods" aria-hidden="true">${periodStripHtml()}</div>
        <div class="ends"><span>Now</span><span>${MAX_MYA} million years ago</span></div>
        <button class="btn" type="button" id="lock-in">Lock in guess</button>
      </div>
    </section>`;
  pixelatePhotos();
  scrollToGame();

  const fossilButton = game.querySelector('[data-call="fossil"]');
  const phoneyButton = game.querySelector('[data-call="phoney"]');
  const guessArea = game.querySelector(".guess");
  const slider = game.querySelector("#age-slider");
  const readout = game.querySelector("#age-readout");

  const currentGuess = () => positionToMya(slider.value / 1000);

  function updateReadout() {
    const mya = currentGuess();
    const period = periodAt(mya);
    readout.innerHTML = `<strong>${formatAge(mya)} ago</strong><span>${period.name}: ${period.note}</span>`;
    for (const strip of game.querySelectorAll(".period")) {
      strip.classList.toggle("active", strip.dataset.period === period.name);
    }
  }

  fossilButton.addEventListener("click", () => {
    fossilButton.setAttribute("aria-pressed", "true");
    guessArea.hidden = false;
    updateReadout();
    slider.focus({ preventScroll: true });
    guessArea.scrollIntoView({ block: "nearest" });
  });
  phoneyButton.addEventListener("click", () => answer(index, "phoney", null));
  slider.addEventListener("input", updateReadout);
  game.querySelector("#lock-in").addEventListener("click", () => answer(index, "fossil", currentGuess()));
}

function answer(index, call, guessMya) {
  const specimen = specimens[index];
  const result = scoreAnswer(specimen, call, guessMya);
  answers.push({ id: specimen.id, call, guessMya, emoji: result.emoji });
  saveDay(day, answers);
  showReveal(index, result, call, guessMya);
}

// ---------- The reveal ----------

function miniTimelineHtml(specimen, guessMya) {
  const [low, high] = specimen.ageRangeMya;
  const left = percent(low);
  const width = Math.max(1, percent(high) - left);
  const guessMarker = guessMya == null
    ? ""
    : `<span class="mini-guess" style="left:${percent(guessMya)}%" title="Your guess"></span>`;
  return `
    <div class="mini-track" aria-hidden="true">
      <span class="mini-range" style="left:${left}%; width:${width}%"></span>
      ${guessMarker}
    </div>
    <div class="ends"><span>Now</span><span>${MAX_MYA} million years ago</span></div>
    <p class="legend"><span class="key key-range"></span> Real age${guessMya == null ? "" : ` <span class="key key-guess"></span> Your guess`}</p>`;
}

function showReveal(index, result, call, guessMya) {
  const specimen = specimens[index];
  const isLast = index === specimens.length - 1;

  let details;
  if (specimen.kind === "fossil") {
    details = `
      <p><strong>Real age:</strong> ${formatRange(specimen.ageRangeMya)} ago (${esc(specimen.period)})</p>
      ${call === "fossil" ? `<p><strong>Your guess:</strong> ${formatAge(guessMya)} ago</p>` : ""}
      ${miniTimelineHtml(specimen, call === "fossil" ? guessMya : null)}`;
  } else {
    details = `<p class="tag">${esc(PHONEY_TYPES[specimen.phoneyType] ?? "Phoney")}</p>`;
  }

  game.innerHTML = `
    <section class="panel reveal" aria-live="polite">
      <p class="step">Specimen ${index + 1} of ${specimens.length}</p>
      <p class="verdict"><span class="verdict-emoji">${result.emoji}</span> ${esc(result.headline)}</p>
      ${photoHtml(specimen)}
      <h2>${esc(specimen.name)}</h2>
      ${details}
      <p class="fact">${esc(specimen.fact)}</p>
      <button class="btn" type="button" id="next">${isLast ? "See results" : "Next specimen"}</button>
    </section>`;
  pixelatePhotos();
  const nextButton = game.querySelector("#next");
  nextButton.addEventListener("click", showNext);
  scrollToGame();
  nextButton.focus({ preventScroll: true });
}

// Brings the top of the game panel into view when the screen changes.
function scrollToGame() {
  if (game.getBoundingClientRect().top < 0) game.scrollIntoView({ block: "start" });
}

// ---------- Results ----------

function showResults() {
  const emojis = answers.map((a) => a.emoji);
  const shareText = buildShareText(day, emojis);

  const summary = specimens.map((s, i) => {
    const detail = s.kind === "fossil"
      ? `${formatRange(s.ageRangeMya)} ago`
      : "Phoney";
    return `<li><span class="summary-emoji">${answers[i]?.emoji ?? ""}</span> <span>${esc(s.name)}<small>${detail}</small></span></li>`;
  }).join("");

  game.innerHTML = `
    <section class="panel results">
      <h2>Today's dig</h2>
      <p class="emoji-row">${emojis.join(" ")}</p>
      <ol class="summary">${summary}</ol>
      <button class="btn" type="button" id="share">Copy result</button>
      <p class="share-status" id="share-status" aria-live="polite"></p>
      <p class="countdown">New specimens in <strong id="countdown"></strong></p>
    </section>`;

  game.querySelector("#share").addEventListener("click", async () => {
    const status = game.querySelector("#share-status");
    if (await copyToClipboard(shareText)) {
      status.textContent = "Copied! Paste it anywhere to share.";
    } else {
      // Clipboard blocked: show the text so it can be copied by hand.
      status.innerHTML = `<textarea readonly rows="3">${esc(shareText)}</textarea>`;
      status.querySelector("textarea").select();
    }
  });

  scrollToGame();
  startCountdown();
}

function startCountdown() {
  const output = game.querySelector("#countdown");
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const ms = msUntilNextDay();
    if (ms <= 1000) {
      location.reload();
      return;
    }
    const total = Math.floor(ms / 1000);
    output.textContent = `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  }
  tick();
  setInterval(tick, 1000);
}

start();
