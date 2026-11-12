// share.js: builds the spoiler-free result text and copies it to the clipboard.

export const SITE_URL = "https://fossil.jackmarsters.com";

export function buildShareText(day, emojis, points, maxPoints) {
  return [`Fossil or Phoney #${day}  ${points}/${maxPoints}`, emojis.join(" "), SITE_URL].join("\n");
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
