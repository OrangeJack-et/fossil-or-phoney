// scoring.js: turns a player's answer into one emoji and a headline.

export const PHONEY_TYPES = {
  pseudofossil: "Pseudofossil: a rock that only looks like a fossil",
  lookalike: "Modern lookalike: real, but not old enough to be a fossil",
  fake: "Commercial fake: made to fool buyers",
  replica: "Replica: a cast of a real fossil",
  hoax: "Famous hoax",
};

// call: "fossil" or "phoney". guessMya: the age guess (only when call is "fossil").
export function scoreAnswer(specimen, call, guessMya) {
  if (specimen.kind === "phoney") {
    return call === "phoney"
      ? { emoji: "🎭", headline: "Well spotted! It's a phoney." }
      : { emoji: "💥", headline: "Fooled you! It's a phoney." };
  }

  if (call === "phoney") {
    return { emoji: "💥", headline: "It was real!" };
  }

  // A fossil, and the player guessed its age.
  const [low, high] = specimen.ageRangeMya;
  if (guessMya >= low && guessMya <= high) {
    return { emoji: "🟩", headline: "Spot on!" };
  }

  // How many times too big or too small, compared with the nearest edge of the range.
  // Measuring it this way means the same mistake counts for more on a young fossil.
  const nearest = guessMya < low ? low : high;
  const ratio = Math.max(guessMya / nearest, nearest / guessMya);

  if (ratio <= 1.25) return { emoji: "🟨", headline: "Close!" };
  if (ratio <= 2) return { emoji: "🟧", headline: "In the ballpark." };
  return { emoji: "⬛", headline: "Way off!" };
}
