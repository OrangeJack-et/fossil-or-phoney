// share.js: builds the spoiler-free result text and copies it to the clipboard.

// Add the live web address here once the game is deployed.
const SITE_URL = "";

export function buildShareText(day, emojis) {
  const lines = [`Fossil or Phoney #${day}`, emojis.join(" ")];
  if (SITE_URL) lines.push(SITE_URL);
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
