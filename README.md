# Fossil or Phoney

A daily guessing game about deep time. Each day everyone gets the same three
specimens. For each one, decide whether it's a **real fossil** or a **phoney**.
If you think it's real, guess how long ago it lived. You finish with a
spoiler-free emoji result to share.

Fossil or Phoney is the first game of **Interdimensional Games Cafe**, a planned
hub of daily mini-games where each door leads to a different game. For now it
is a standalone website.

> Status: playable with 11 example specimens and real photos. Not deployed yet.

## How it plays

For each of the 3 specimens:

1. **Look**: a photo (pixelated to match the site), a short clue and where it was found.
2. **Fossil or phoney?**
3. **If fossil, guess the age** on a timeline slider that runs from now to 600
   million years ago. The slider uses a cube-root scale so every era gets
   room: on a straight scale, the last 100 million years would be a sliver.
   While you drag, it tells you which geological period you're in.
4. **Reveal**: the real answer, a timeline showing your guess against the real
   age, and a fun fact.

Scoring, one emoji per specimen:

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
Fossil or Phoney #12
🟩 🎭 🟧
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

Scale: 3 a day with a 60-day gap needs at least 180 specimens to avoid
repeats. Around 200 to 250 is a comfortable launch pool, and it can keep
growing after launch.

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

Then open <http://localhost:8000>. To replay today while testing, open the
browser's developer tools console and run `localStorage.clear()`, then reload.

## Project layout

```
fossil-or-phoney/
├── index.html           the page
├── css/style.css        pixel-art styling (Jersey 10 + Pixelify Sans)
├── js/main.js           the screens: specimen, guess, reveal, results
├── js/daily.js          day number, seeded randomness, today's 3 specimens
├── js/timeline.js       slider scale, geological periods, age wording
├── js/scoring.js        turns an answer into an emoji
├── js/storage.js        remembers today's answers in the browser
├── js/share.js          share text and copy-to-clipboard
├── data/specimens.json  the specimen pool
└── assets/              photos (with credits)
```

## Hosting (planned)

This is plain HTML, CSS and JavaScript with no build step, so it can be hosted
free on GitHub Pages or Cloudflare Pages, for example at
`fossil.jackmarsters.com`. Before launch, set `LAUNCH_DATE` in `js/daily.js` and
`SITE_URL` in `js/share.js`.

## Ideas for later

- Streaks and stats (games played, average score).
- A "hint" that un-pixelates the photo, at the cost of a point.
- An archive to play past days.

## Credits

- Fonts: [Jersey 10](https://fonts.google.com/specimen/Jersey+10) and
  [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License).
- Specimen photos are from [Wikimedia Commons](https://commons.wikimedia.org/).
  They have been resized and pixelated, and some have been cropped to remove
  labels. Each photo is credited on its reveal screen, with a link to its page.

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
