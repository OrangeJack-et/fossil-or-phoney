// scoring.js: turns a player's answer into points, an emoji and a headline.

export const PHONEY_TYPES = {
  pseudofossil: "Pseudofossil: a rock that only looks like a fossil",
  lookalike: "Modern lookalike: real, but not old enough to be a fossil",
  fake: "Commercial fake: made to fool buyers",
  replica: "Replica: a cast of a real fossil",
  hoax: "Famous hoax",
};

export const MAX_POINTS = 100;

// A guess this many times too big or too small (or worse) scores 0.
const ZERO_POINTS_RATIO = 5;

// Points for an age guess outside the real range. Measured as a ratio, not in
// years, so the same mistake costs more on a young fossil than an old one.
// 1.25x off -> about 86, 2x -> about 57, 3x -> about 32, 5x or more -> 0.
function pointsForRatio(ratio) {
  const points = Math.round(MAX_POINTS * (1 - Math.log(ratio) / Math.log(ZERO_POINTS_RATIO)));
  // Only a guess inside the range gets the full 100.
  return Math.max(0, Math.min(MAX_POINTS - 1, points));
}

// call: "fossil" or "phoney". guessMya: the age guess (only when call is "fossil").
export function scoreAnswer(specimen, call, guessMya) {
  if (specimen.kind === "phoney") {
    return call === "phoney"
      ? { points: MAX_POINTS, emoji: "🎭", headline: "Well spotted! It's a phoney." }
      : { points: 0, emoji: "💥", headline: "Fooled you! It's a phoney." };
  }

  if (call === "phoney") {
    return { points: 0, emoji: "💥", headline: "It was real!" };
  }

  // A fossil, and the player guessed its age.
  const [low, high] = specimen.ageRangeMya;
  if (guessMya >= low && guessMya <= high) {
    return { points: MAX_POINTS, emoji: "🟩", headline: "Spot on!" };
  }

  // How many times too big or too small, compared with the nearest edge of the range.
  const nearest = guessMya < low ? low : high;
  const ratio = Math.max(guessMya / nearest, nearest / guessMya);
  const points = pointsForRatio(ratio);

  if (ratio <= 1.25) return { points, emoji: "🟨", headline: "Close!" };
  if (ratio <= 2) return { points, emoji: "🟧", headline: "In the ballpark." };
  return { points, emoji: "⬛", headline: "Way off!" };
}
