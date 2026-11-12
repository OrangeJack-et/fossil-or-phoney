// testmode.js: a hidden testing mode for checking every day and every specimen.
//
// Open the game with ?test on the end of the address and enter the password.
// The site has no server, so this check runs in the browser: it keeps answers
// hidden from casual players, but it is not real security. Only a SHA-256 hash
// of the password is stored here. To change the password, run:
//   python tools/set-test-password.py

export const PASSWORD_HASH = "b822f1cd2dcfc685b47e83e3980289fd5d8e3ff3a82def24d7d1d68bb272eb32";

const STORAGE_KEY = "fossil-or-phoney:test-unlocked";

// True when the address asks for test mode (…/?test).
export function testRequested() {
  return new URLSearchParams(location.search).has("test");
}

// True when this browser has already entered the right password.
export function isUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === PASSWORD_HASH;
  } catch {
    return false;
  }
}

async function sha256(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Checks a password. Returns true (and remembers it) if it's right.
export async function unlock(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Test mode needs a secure page (https:// or localhost).");
  }
  const ok = (await sha256(password)) === PASSWORD_HASH;
  if (ok) {
    try {
      localStorage.setItem(STORAGE_KEY, PASSWORD_HASH);
    } catch {
      // Storage blocked: it will just ask again next time.
    }
  }
  return ok;
}

export function lock() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
