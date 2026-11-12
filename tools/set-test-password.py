"""Sets the password for test mode (open the game with ?test on the end of the address).

Only a SHA-256 hash of the password is saved, in js/testmode.js, so the password
itself never appears in the code. Run: python tools/set-test-password.py
"""
import getpass
import hashlib
import re
from pathlib import Path

TESTMODE_JS = Path(__file__).resolve().parent.parent / "js" / "testmode.js"

password = getpass.getpass("New test-mode password: ")
if not password or password != getpass.getpass("Type it again: "):
    raise SystemExit("Passwords didn't match (or were empty). Nothing changed.")

digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
code = TESTMODE_JS.read_text(encoding="utf-8")
code, count = re.subn(r'PASSWORD_HASH = "[0-9a-f]{64}"', f'PASSWORD_HASH = "{digest}"', code)
if count != 1:
    raise SystemExit("Couldn't find PASSWORD_HASH in js/testmode.js. Nothing changed.")
TESTMODE_JS.write_text(code, encoding="utf-8", newline="\n")
print("Test-mode password updated. Commit and push js/testmode.js to use it on the live site.")
