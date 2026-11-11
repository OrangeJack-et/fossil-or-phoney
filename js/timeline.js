// timeline.js: the age slider's scale, geological periods, and friendly age text.

// The slider runs from "now" (left) to this many million years ago (right).
export const MAX_MYA = 600;
const MIN_MYA = 0.005; // 5,000 years: the youngest guess allowed

// The slider uses a cube-root scale. A straight scale would squash the last
// 100 million years into a sliver; this spreads every era out fairly evenly.
// position: 0 (left) to 1 (right).
export function positionToMya(position) {
  return Math.max(MIN_MYA, MAX_MYA * position ** 3);
}

export function myaToPosition(mya) {
  return Math.cbrt(Math.min(mya, MAX_MYA) / MAX_MYA);
}

// Geological periods, youngest first. Ages in millions of years ago.
// `short` is the label drawn on the slider; periods too narrow to label have none.
export const PERIODS = [
  { name: "Quaternary", short: "Quat", start: 0, end: 2.58, note: "Ice ages, mammoths and humans" },
  { name: "Neogene", short: "Neo", start: 2.58, end: 23, note: "Megalodon and early apes" },
  { name: "Paleogene", short: "Paleo", start: 23, end: 66, note: "Mammals take over after the dinosaurs" },
  { name: "Cretaceous", short: "Cret", start: 66, end: 145, note: "T. rex and the first flowers" },
  { name: "Jurassic", short: "Jur", start: 145, end: 201, note: "Giant dinosaurs, seas full of ammonites" },
  { name: "Triassic", short: "", start: 201, end: 252, note: "The first dinosaurs and mammals" },
  { name: "Permian", short: "", start: 252, end: 299, note: "Ends with the biggest mass extinction ever" },
  { name: "Carboniferous", short: "", start: 299, end: 359, note: "Coal swamps and giant insects" },
  { name: "Devonian", short: "", start: 359, end: 419, note: "The age of fishes" },
  { name: "Silurian", short: "", start: 419, end: 444, note: "Early plants creep onto land" },
  { name: "Ordovician", short: "", start: 444, end: 485, note: "Trilobites and the first fish" },
  { name: "Cambrian", short: "", start: 485, end: 539, note: "An explosion of animal life" },
  { name: "Ediacaran", short: "", start: 539, end: MAX_MYA, note: "Strange soft-bodied life" },
];

export function periodAt(mya) {
  return PERIODS.find((p) => mya < p.end) ?? PERIODS[PERIODS.length - 1];
}

// Rounds to a couple of significant figures, so "182.3" reads as "180".
function roundNicely(value) {
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 10) / 10;
}

// 0.04 -> "40,000 years", 182 -> "180 million years", 1200 -> "1.2 billion years"
export function formatAge(mya) {
  if (mya >= 1000) return `${roundNicely(mya / 1000)} billion years`;
  if (mya >= 1) return `${roundNicely(mya)} million years`;
  const years = mya * 1_000_000;
  const rounded = Number(years.toPrecision(2));
  return `${rounded.toLocaleString("en-GB")} years`;
}

// [504, 510] -> "504 to 510 million years". Ranges are written by hand, so they
// are shown as written rather than rounded.
export function formatRange([low, high]) {
  if (low >= 1 && high >= 1) {
    const show = (n) => Number(n.toFixed(1)).toLocaleString("en-GB");
    return `${show(low)} to ${show(high)} million years`;
  }
  return `${formatAge(low)} to ${formatAge(high)}`;
}
