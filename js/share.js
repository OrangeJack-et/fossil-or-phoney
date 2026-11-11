// share.js: builds the spoiler-free result text and copies it to the clipboard.

// score: how many bones out of `outOf` the player earned.
export function buildShareText({ day, score, outOf = 5, note = "" }) {
  const bones = "🦴".repeat(score) + "⬜".repeat(outOf - score);
  const lines = [`Fossil or Phoney #${day}`, note ? `${bones}  ${note}` : bones];
  return lines.join("\n");
}

// Copies text to the clipboard. Returns true if it worked.
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
