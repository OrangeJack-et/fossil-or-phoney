# Fossil or Phoney

**Play it: <https://fossil.jackmarsters.com>**

A daily guessing game about deep time. Each day everyone gets the same three
specimens. For each one, decide whether it's a **real fossil** or a **phoney**.
If you think it's real, guess how long ago it lived. You finish with a
spoiler-free emoji result to share.

Fossil or Phoney is the first game of **Interdimensional Games Cafe**, a planned
hub of daily mini-games where each door leads to a different game. For now it
is a standalone website.

> Status: 182 specimens (132 fossils, 50 phoneys), each with a real photo and a
> source link. Hosted on GitHub Pages. Day 1 was 11 November 2026 (pre-launch).

## How it plays

For each of the 3 specimens:

1. **Look**: a photo (pixelated to match the site, and to make reverse image
   searches harder), a short clue and where it was found.
2. **Fossil or phoney?**
3. **If fossil, guess the age** on a timeline slider that runs from now to 600
   million years ago. The slider uses a cube-root scale so every era gets
   room: on a straight scale, the last 100 million years would be a sliver.
   While you drag, it tells you which geological period you're in.
4. **Reveal**: the sharp photo comes into focus, with the real answer, your
   points, a timeline showing your guess against the real age, and a fun fact.

### Points

Each specimen is worth up to **100 points**, so a day is out of 300
(`js/scoring.js`).

| Result | Points |
|---|---|
| Phoney, and you said phoney | 100 |
| Fooled either way | 0 |
| Fossil, guess inside the real age range | 100 |
| Fossil, guess 1.25× too big or small | about 86 |
| Fossil, guess 2× off | about 57 |
| Fossil, guess 3× off | about 32 |
| Fossil, guess 5× off or more | 0 |

Outside the range, points = 100 × (1 − log(ratio) ÷ log(5)), where *ratio* is
how many times too big or too small the guess is compared with the nearest
edge of the range.

### Emoji

One emoji per specimen, for the spoiler-free share text:

| Emoji | Meaning |
|---|---|
| 🟩 | Spot on: your guess is inside the real age range |
| 🟨 | Close: within 25% of the range |
| 🟧 | Ballpark: within 2× of the range |
| ⬛ | Way off |
| 🎭 | Correctly spotted a phoney |
| 💥 | Fooled: called a real fossil phoney, or the other way round |

"Close" is measured as a ratio, not in years. Being off by 10 million years is
a big miss for a 20-million-year-old fossil and a tiny one for a 500-million-year-old one.

Example share text:

```
Fossil or Phoney #12  245/300
🟩 🎭 🟧
https://fossil.jackmarsters.com
```

Answers are saved in the browser, so reloading carries on where you left off
and you can't replay today.

## What counts as a phoney

Real things that genuinely fool people. No AI-generated images: players would
learn to spot image-generator tells instead of fossils, and the reveal would
have no story.

| Type | Examples | Supply |
|---|---|---|
| Pseudofossil | Manganese dendrites (look like ferns), concretions | Plenty |
| Modern lookalike | A nautilus shell (looks like an ammonite), a recent bone | Plenty |
| Commercial fake | Moroccan resin-cast trilobites, composites | Some (photos often owned by dealers) |
| Famous hoax | Beringer's lying stones, Piltdown Man, Archaeoraptor | A few dozen, used as treats |

Each day has 0, 1 or 2 phoneys (chosen at random, the same for everyone), so you
can't assume there's always exactly one.

## How the daily pick works

There is no server and no database. Everything happens in the browser
(`js/daily.js`):

- The day number counts from `LAUNCH_DATE` in **UTC**, so the day changes at the
  same moment for everyone.
- A **seeded random number generator** turns the day number into the same
  "random" choices for every player.
- Each day picks 3 specimens from the pool in `data/specimens.json`. A
  specimen isn't reused for 60 days, as long as the pool is big enough.
- Every specimen has an `added` date and is only used from that day on, so
  **adding new specimens never changes past days**. Don't delete specimens,
  change their `id` or change their `added` date, because that would.

Scale: with 132 fossils, no fossil repeats within 60 days. With 50 phoneys,
a phoney can come back after about six weeks, so adding phoneys is the best
way to improve variety.

## Where specimens will come from

| Source | What it has | Licence |
|---|---|---|
| [GBIF](https://www.gbif.org/) | One API over many museums, filterable to fossil specimens with images. Python client: `pygbif` | Varies per record (filter for CC0 / CC BY) |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | Images and records with an API (free key). Number of fossil photos still to check | CC0 |
| [Yale Peabody Museum](https://peabody.yale.edu/) | Large digitised fossil collections with images | CC0 |
| [Natural History Museum, London](https://data.nhm.ac.uk/) | Specimen records and images, with an API | Data CC0, images CC BY 4.0 |
| [GB3D Type Fossils](https://www.bgs.ac.uk/geological-data/national-geological-repository/gb3d-type-fossils-online/) | About 17,500 British type fossils with photos and ages | Non-commercial only |
| [Paleobiology Database](https://paleobiodb.org/) | Fact-checking ages and periods | CC BY |

Things to watch for when picking photos:
- **Labels in shot.** Museum photos often show the specimen label, which gives
  the answer away, so crop or skip those.
- **Dull specimens.** Many records are fragments or drawer shots. Pull
  candidates automatically, then hand-pick the good ones.
- **Missing ages.** Only use records that include a geological period or age.

## Adding a specimen

Add an entry to the end of `data/specimens.json` (the `_readme` at the top of
that file explains every field). Then:

1. Find a photo with the tool in `tools/commons.py`. It searches Wikimedia
   Commons, keeps only openly licensed photos, and builds a contact sheet to
   compare them. Run `python tools/commons.py --help` for the steps.
2. `python tools/commons.py add <id> <number> --crop ...` crops out labels,
   resizes the photo to 480 px wide, saves it as `assets/<id>.jpg`, and prints
   the `image` and `photo` lines to paste into the entry.
3. The reveal screen shows `photo` as the credit, which the licences require.

`docs/specimen-wishlist.md` lists the specimens planned for the pool.

The game pixelates photos automatically. Only use photos licensed CC0, public
domain, CC BY or CC BY-SA.

The 11 entries marked `"example": true` are starter content. Check each fact
against a source before launch.

## Run it locally

The page loads its data with `fetch`, and browsers block that for pages opened
straight from a file. So start a tiny local web server from this folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Test mode

Open the game with `?test` on the end of the address (for example
<http://localhost:8000/?test>) and enter the test password. Then you can:

- **Play any day** to see exactly what players get on a given date.
- **Play any single specimen** from a searchable list, filtered by fossil or
  phoney and by period, to check its photo, clue and facts.
- **Show the answer** on any specimen without playing it.

Test answers are never saved, so they don't affect the real game. The browser
remembers the password until you press **Exit test mode**.

Only a SHA-256 hash of the password is stored (in `js/testmode.js`). To change
it, run `python tools/set-test-password.py`, then commit and push. The site has
no server, so this only hides answers from casual players: it isn't real
security, and anyone technical could bypass it.

## Project layout

```
fossil-or-phoney/
├── index.html           the page
├── css/style.css        pixel-art styling (Jersey 10, UI pack frames and buttons)
├── js/main.js           the screens: specimen, guess, reveal, results
├── js/daily.js          day number, seeded randomness, today's 3 specimens
├── js/timeline.js       slider scale, geological periods, age wording
├── js/scoring.js        turns an answer into points and an emoji
├── js/storage.js        remembers today's answers in the browser
├── js/share.js          share text and copy-to-clipboard
├── js/testmode.js       hidden test mode password check
├── data/specimens.json  the specimen pool
├── assets/              photos (with credits) and the link-preview card
└── tools/               photo tool, logo and preview card makers, test password setter
```

## Hosting

Plain HTML, CSS and JavaScript with no build step, hosted free on **GitHub
Pages** from the `main` branch, at `fossil.jackmarsters.com` (a CNAME record at
the domain registrar points `fossil` to `orangejack-et.github.io`). Every push
to `main` updates the live site. The empty `.nojekyll` file tells GitHub Pages
to serve the files as they are.

The link-preview image (`assets/social-card.png`) is made by
`python tools/make-social-card.py`.

## Ideas for later

- Streaks and stats (games played, average score).
- A "hint" that un-pixelates the photo, at the cost of some points.
- An archive to play past days.

## Credits

- Font: [Jersey 10](https://fonts.google.com/specimen/Jersey+10) (SIL Open Font
  License), as on [fiddle.jackmarsters.com](https://fiddle.jackmarsters.com).
- Logo (`assets/ui/logo.png`, made by `python tools/make-logo.py`): letters in
  [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) Bold (SIL
  Open Font License), in the style of the Riddle-da-Fiddle logo, with a
  pixelated [trilobite icon from SVG Repo](https://www.svgrepo.com/svg/321624/trilobite)
  (CC0, saved as `tools/trilobite.svg`) behind them.
- Frames, buttons, banner and mouse pointers: the
  [Pixel Art Fantasy UI Pack by Quintino Pixels](https://quintino-pixels.itch.io/pixel-art-ui-elements)
  (CC0), cut into `assets/ui/` (the same pieces as Riddle-da-Fiddle; the pointers
  are from [1-bit Pixel Icons by Nikoichu](https://nikoichu.itch.io/pixel-icons), CC0).
- Specimen photos are from [Wikimedia Commons](https://commons.wikimedia.org/).
  They have been resized and pixelated, and some have been cropped to remove
  labels. Each photo is credited on its reveal screen, with a link to its page.
  The full list of authors and licences is in `data/specimens.json` (the
  `photo` field of each entry). The first 11 are listed here:

| Photo | Author | Licence |
|---|---|---|
| [Trilobite](https://commons.wikimedia.org/wiki/File:Elrathia_kingii.JPG) | Tortie tude | CC0 |
| [Ammonite](https://commons.wikimedia.org/wiki/File:Dactylioceras_commune.jpg) | Fred Cherrygarden | CC BY-SA 4.0 |
| [T. rex tooth](https://commons.wikimedia.org/wiki/File:T_rex_tooth_-_Garfield_County_Montana_-_Museum_of_the_Rockies_-_2013-07-08.jpg) (cropped) | Tim Evanson | CC BY-SA 2.0 |
| [Megalodon tooth](https://commons.wikimedia.org/wiki/File:Megalodon_shark_tooth_fossil.jpg) | WorldwrestlingfederationVKM | CC BY-SA 3.0 |
| [Fly in amber](https://commons.wikimedia.org/wiki/File:Fossil_insect_Diptera,_Brachycera_in_Baltic_amber._Age_50_Mill._years_(the_Lower_Eocene).jpg) | Manukyan Andranik | CC BY-SA 4.0 |
| [Seed fern](https://commons.wikimedia.org/wiki/File:Neuropteris_flexuosa_kz01.jpg) | Krzysztof Ziarnek, Kenraiz | CC BY-SA 4.0 |
| [Mammoth tooth](https://commons.wikimedia.org/wiki/File:Woolly_mammoth_molar_-_Cleveland_Museum_of_Natural_History_-_2014-12-26_(20859260938).jpg) | Tim Evanson | CC BY-SA 2.0 |
| [Manganese dendrites](https://commons.wikimedia.org/wiki/File:Manganese_dendrites.jpg) | Géry Parent | CC BY-SA 3.0 |
| [Nautilus shell](https://commons.wikimedia.org/wiki/File:Nautilus_pompilius_(YPM_IZ_047418).jpeg) (cropped) | Eric A. Lazo-Wasem, Yale Peabody Museum | CC0 |
| [Fake trilobite](https://commons.wikimedia.org/wiki/File:Fake_trilobite-bearing_concretion.jpg) (cropped) | James St. John | CC BY 2.0 |
| [Beringer's lying stones](https://commons.wikimedia.org/wiki/File:Luegensteine_Senckenberg.jpg) | MBq | CC BY-SA 4.0 |

The CC BY-SA ("share-alike") licences mean the edited photos in `assets/` are
shared under the same licence as their originals.
