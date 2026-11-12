// main.js: runs the game on the page.
// The flow for each specimen: fossil or phoney? -> (if fossil) guess the age -> reveal.
// After the last specimen: results with points, a share button, and a countdown to tomorrow.
// With ?test in the address (and the password), a test mode can play any day or specimen.

import { dayNumber, dateForDay, specimensForDay, msUntilNextDay } from "./daily.js";
import { positionToMya, myaToPosition, PERIODS, periodAt, formatAge, formatRange, MAX_MYA } from "./timeline.js";
import { scoreAnswer, PHONEY_TYPES, MAX_POINTS } from "./scoring.js";
import { loadDay, saveDay } from "./storage.js";
import { buildShareText, copyToClipboard } from "./share.js";
import { testRequested, isUnlocked, unlock, lock } from "./testmode.js";

const game = document.getElementById("game");
const puzzleLabel = document.getElementById("puzzle-number");

// The desert background layers shift up a little as you scroll (parallax).
// CSS reads the scroll distance from this variable.
const setScroll = () => document.documentElement.style.setProperty("--scroll", String(Math.round(window.scrollY)));
window.addEventListener("scroll", setScroll, { passive: true });
setScroll();

let allSpecimens = [];  // the whole pool
let specimens = [];     // the specimens being played right now
let answers = [];       // answers so far: { id, call, guessMya, emoji, points }
let day;                // the puzzle number being played (null for a single test specimen)
let testing = false;    // true in test mode: nothing is saved, and the results go back to the test menu

// Makes text safe to put inside HTML.
function esc(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

const percent = (mya) => (myaToPosition(mya) * 100).toFixed(2);
const totalPoints = () => answers.reduce((sum, a) => sum + (a.points ?? 0), 0);
const maxPoints = () => specimens.length * MAX_POINTS;

async function start() {
  try {
    const response = await fetch("data/specimens.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allSpecimens = (await response.json()).specimens;
  } catch (error) {
    console.error("Could not load specimens:", error);
    game.innerHTML = `<section class="panel"><p>Today's specimens couldn't be loaded. Try refreshing the page.</p></section>`;
    return;
  }

  if (testRequested()) {
    testing = true;
    if (isUnlocked()) showTestMenu();
    else showPasswordPrompt();
    return;
  }

  day = dayNumber();
  if (day < 1) {
    puzzleLabel.textContent = "Opening soon";
    game.innerHTML = `<section class="panel"><p>The first specimens arrive soon.</p></section>`;
    return;
  }
  puzzleLabel.textContent = `Puzzle #${day}`;
  specimens = specimensForDay(allSpecimens, day);
  answers = loadDay(day).slice(0, specimens.length);
  showNext();
}

function showNext() {
  if (answers.length >= specimens.length) showResults();
  else showSpecimen(answers.length);
}

// ---------- Photos ----------

// How many pixels across the photo is drawn at while guessing. Fewer = chunkier pixel art.
const PIXEL_WIDTH = 128;

// While guessing: a pixelated photo. On the reveal (sharp = true): the pixelated
// photo first, then the sharp photo fades into focus over the top.
function photoHtml(specimen, sharp = false) {
  const label = `role="img" aria-label="${esc(specimen.clue)}"`;
  if (!specimen.image) {
    return `<div class="photo placeholder" ${label}><span>Photo coming soon</span></div>`;
  }
  // A few phoneys are only fair with the fine detail visible, so they're never pixelated.
  if (specimen.sharp) {
    return `<img class="photo unpixelated" src="${esc(specimen.image)}" alt="" ${label}>`;
  }
  if (!sharp) {
    return `<canvas class="photo" data-src="${esc(specimen.image)}" ${label}></canvas>`;
  }
  return `<div class="photo photo-stack" ${label}>
      <canvas data-src="${esc(specimen.image)}"></canvas>
      <img class="sharp" src="${esc(specimen.image)}" alt="">
    </div>`;
}

// Draws each photo small, then CSS scales it up with hard edges: instant pixel art.
function pixelatePhotos() {
  for (const canvas of game.querySelectorAll("canvas[data-src]")) {
    const img = new Image();
    img.onload = () => {
      // Tall photos are limited by height instead, so they don't get too detailed.
      const scale = Math.min(PIXEL_WIDTH / img.width, (PIXEL_WIDTH * 0.875) / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = canvas.dataset.src;
  }
  // Bring sharp photos into focus once they've loaded.
  for (const sharp of game.querySelectorAll("img.sharp")) {
    const focus = () => setTimeout(() => sharp.classList.add("shown"), 350);
    if (sharp.complete) focus();
    else sharp.addEventListener("load", focus, { once: true });
  }
}

// Credit line for the reveal screen. It is only shown after answering,
// because the photo's page name would give the answer away.
function creditHtml(specimen) {
  const photo = specimen.photo;
  if (!photo) return "";
  // Public-domain photos have no licence page to link to.
  const licence = photo.licenceUrl
    ? `<a href="${esc(photo.licenceUrl)}" target="_blank" rel="noopener">${esc(photo.licence)}</a>`
    : esc(photo.licence);
  return `<p class="credit">Photo: <a href="${esc(photo.page)}" target="_blank" rel="noopener">${esc(photo.author)}</a>,
    ${licence}, edited</p>`;
}

// ---------- One specimen ----------

function periodStripHtml() {
  return PERIODS.map((p) => {
    const width = (myaToPosition(p.end) - myaToPosition(p.start)) * 100;
    return `<span class="period" data-period="${p.name}" style="width:${width.toFixed(2)}%" title="${p.name}">${p.short}</span>`;
  }).join("");
}

// The answer in one line, for test mode's "Show answer" button.
function answerSummary(specimen) {
  if (specimen.kind === "fossil") {
    return `${esc(specimen.name)}: real fossil, ${formatRange(specimen.ageRangeMya)} ago`;
  }
  return `${esc(specimen.name)}: phoney (${esc(specimen.phoneyType)})`;
}

function showSpecimen(index) {
  const specimen = specimens[index];
  game.innerHTML = `
    <section class="panel specimen">
      <p class="step">Specimen ${index + 1} of ${specimens.length}
        ${answers.length ? `<span class="running-total">${totalPoints()} pts</span>` : ""}</p>
      ${photoHtml(specimen)}
      <p class="clue">${esc(specimen.clue)}</p>
      <p class="found"><span>Found:</span> ${esc(specimen.foundIn)}</p>
      ${testing ? `<p class="test-answer"><button class="link-btn" type="button" id="show-answer">Show answer</button></p>` : ""}

      <p class="question">Real fossil, or phoney?</p>
      <div class="choice">
        <button class="btn btn-gold" type="button" data-call="fossil" aria-pressed="false">🦴 Fossil</button>
        <button class="btn btn-red" type="button" data-call="phoney">🎭 Phoney</button>
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

  game.querySelector("#show-answer")?.addEventListener("click", (event) => {
    event.target.parentElement.innerHTML = answerSummary(specimen);
  });
}

function answer(index, call, guessMya) {
  const specimen = specimens[index];
  const result = scoreAnswer(specimen, call, guessMya);
  answers.push({ id: specimen.id, call, guessMya, emoji: result.emoji, points: result.points });
  if (!testing) saveDay(day, answers);
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
      <p class="points"><span class="points-gained"><strong>+${result.points}</strong> points</span>
        <span class="points-total">Total: ${totalPoints()} / ${maxPoints()}</span></p>
      ${photoHtml(specimen, true)}
      <h2>${esc(specimen.name)}</h2>
      ${details}
      <p class="fact">${esc(specimen.fact)}</p>
      ${specimen.source ? `<p class="read-more"><a href="${esc(specimen.source)}" target="_blank" rel="noopener">Read more about it</a></p>` : ""}
      ${creditHtml(specimen)}
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

  const summary = specimens.map((s, i) => {
    const detail = s.kind === "fossil" ? `${formatRange(s.ageRangeMya)} ago` : "Phoney";
    const points = answers[i]?.points ?? 0;
    return `<li><span class="summary-emoji">${answers[i]?.emoji ?? ""}</span>
      <span class="summary-name">${esc(s.name)}<small>${detail}</small></span>
      <span class="summary-points">${points}</span></li>`;
  }).join("");

  const footer = testing
    ? `<button class="btn" type="button" id="back-to-tests">Back to the test menu</button>`
    : `<button class="btn" type="button" id="share">Copy result</button>
       <p class="share-status" id="share-status" aria-live="polite"></p>
       <p class="countdown">New specimens in <strong id="countdown"></strong></p>`;

  game.innerHTML = `
    <section class="panel results">
      <h2>${testing ? "Test results" : "Today's dig"}</h2>
      <p class="score"><strong>${totalPoints()}</strong> / ${maxPoints()} points</p>
      <p class="emoji-row">${emojis.join(" ")}</p>
      <ol class="summary">${summary}</ol>
      ${footer}
    </section>`;

  if (testing) {
    game.querySelector("#back-to-tests").addEventListener("click", showTestMenu);
  } else {
    const shareText = buildShareText(day, emojis, totalPoints(), maxPoints());
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
    startCountdown();
  }
  scrollToGame();
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

// ---------- Test mode ----------

function testBanner() {
  if (document.getElementById("test-banner")) return;
  const banner = document.createElement("div");
  banner.id = "test-banner";
  banner.className = "test-banner";
  banner.innerHTML = `<strong>TEST MODE</strong>
    <button class="link-btn" type="button" id="test-menu-btn">Test menu</button>
    <button class="link-btn" type="button" id="exit-test">Exit test mode</button>`;
  document.body.prepend(banner);
  banner.querySelector("#test-menu-btn").addEventListener("click", showTestMenu);
  banner.querySelector("#exit-test").addEventListener("click", () => {
    lock();
    location.href = location.pathname; // the normal game, without ?test
  });
}

function showPasswordPrompt() {
  puzzleLabel.textContent = "Test mode";
  game.innerHTML = `
    <section class="panel">
      <h2>Test mode</h2>
      <form id="test-login" class="test-login">
        <label for="test-password">Password</label>
        <input type="password" id="test-password" autocomplete="current-password" required>
        <button class="btn" type="submit">Unlock</button>
        <p class="test-error" id="test-error" aria-live="polite"></p>
      </form>
    </section>`;
  const form = game.querySelector("#test-login");
  const input = game.querySelector("#test-password");
  input.focus();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = game.querySelector("#test-error");
    try {
      if (await unlock(input.value)) showTestMenu();
      else error.textContent = "That's not the password.";
    } catch (problem) {
      error.textContent = problem.message;
    }
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function showTestMenu() {
  testBanner();
  puzzleLabel.textContent = "Test mode";
  const today = Math.max(1, dayNumber());
  const periodOptions = PERIODS.map((p) => `<option value="${p.name}">${p.name}</option>`).join("");

  game.innerHTML = `
    <section class="panel test-panel">
      <h2>Play any day</h2>
      <div class="test-day">
        <button class="btn btn-small btn-wood" type="button" id="day-prev" aria-label="Previous day">◀</button>
        <label>Day <input type="number" id="test-day" min="1" value="${today}"></label>
        <button class="btn btn-small btn-wood" type="button" id="day-next" aria-label="Next day">▶</button>
      </div>
      <p class="test-day-info" id="test-day-info"></p>
      <button class="btn" type="button" id="play-day">Play this day</button>
    </section>

    <section class="panel test-panel">
      <h2>Play one specimen</h2>
      <div class="test-filters">
        <input type="search" id="test-search" placeholder="Search names" aria-label="Search names">
        <select id="test-kind" aria-label="Fossil or phoney">
          <option value="">All kinds</option><option value="fossil">Fossils</option><option value="phoney">Phoneys</option>
        </select>
        <select id="test-period" aria-label="Period"><option value="">All periods</option>${periodOptions}</select>
      </div>
      <p class="test-count" id="test-count"></p>
      <ul class="test-list" id="test-list"></ul>
    </section>`;

  const dayInput = game.querySelector("#test-day");
  const dayInfo = game.querySelector("#test-day-info");

  function showDayInfo() {
    const n = Math.max(1, parseInt(dayInput.value, 10) || 1);
    dayInput.value = n;
    const names = specimensForDay(allSpecimens, n).map((s) => `${esc(s.name)}${s.kind === "phoney" ? " (phoney)" : ""}`);
    dayInfo.innerHTML = `${formatDate(dateForDay(n))}${n === today ? " (today)" : ""}<br><small>${names.join(" · ")}</small>`;
  }
  game.querySelector("#day-prev").addEventListener("click", () => { dayInput.value = Math.max(1, dayInput.value - 1); showDayInfo(); });
  game.querySelector("#day-next").addEventListener("click", () => { dayInput.value = Number(dayInput.value) + 1; showDayInfo(); });
  dayInput.addEventListener("change", showDayInfo);
  game.querySelector("#play-day").addEventListener("click", () => {
    day = Math.max(1, parseInt(dayInput.value, 10) || 1);
    playTest(specimensForDay(allSpecimens, day), `Test · Puzzle #${day}`);
  });
  showDayInfo();

  const search = game.querySelector("#test-search");
  const kind = game.querySelector("#test-kind");
  const period = game.querySelector("#test-period");
  const list = game.querySelector("#test-list");
  const count = game.querySelector("#test-count");

  function showList() {
    const words = search.value.trim().toLowerCase();
    const matches = allSpecimens.filter((s) =>
      (!words || `${s.name} ${s.id}`.toLowerCase().includes(words)) &&
      (!kind.value || s.kind === kind.value) &&
      (!period.value || (s.kind === "fossil" && periodAt(s.ageMya).name === period.value)));
    count.textContent = `${matches.length} of ${allSpecimens.length} specimens`;
    list.innerHTML = matches.map((s) => `
      <li><button class="test-item" type="button" data-id="${esc(s.id)}">
        <span>${esc(s.name)}</span>
        <small>${s.kind === "fossil" ? `${esc(periodAt(s.ageMya).name)} · ${formatAge(s.ageMya)} ago` : `Phoney · ${esc(s.phoneyType)}`}</small>
      </button></li>`).join("");
  }
  for (const control of [search, kind, period]) control.addEventListener("input", showList);
  list.addEventListener("click", (event) => {
    const item = event.target.closest(".test-item");
    if (!item) return;
    const specimen = allSpecimens.find((s) => s.id === item.dataset.id);
    day = null;
    playTest([specimen], `Test · ${specimen.name}`);
  });
  showList();
  scrollToGame();
}

function playTest(list, label) {
  specimens = list;
  answers = [];
  puzzleLabel.textContent = label;
  showNext();
}

start();
