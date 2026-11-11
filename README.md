# Fossil or Phoney

A daily guessing game about deep time. Each day everyone gets the same fossil,
guesses how old it is, and scores more the closer they get. The result can be
shared as a short emoji line, so nobody's guess gets spoiled.

Fossil or Phoney is the first game of **Interdimensional Games Cafe**, a planned
hub of daily mini-games where each door leads to a different game. For now it
is a standalone website.

> Status: early setup. The page loads and works out today's puzzle number, but
> there is no gameplay yet.

## How it will play

1. You see today's fossil: a picture, its name, and where it was found.
2. You guess its age in **millions of years** (Mya).
3. You get a score based on how close you were, then a shareable result like:

   ```
   Fossil or Phoney #12
   🦴🦴🦴⬜⬜  off by 8%
   ```

Still to decide:
- **The "phoney" twist.** Ideas: some days the fossil is a fake or a famous
  hoax, and you have to spot it; or every round shows two fossils and you pick
  the real one before guessing its age.
- **Scoring.** Probably measured as a percentage (or on a log scale), so being
  off by 10 million years counts for a lot with a 20-million-year-old fossil
  but very little with a 500-million-year-old one.
- **Rounds.** Probably one fossil a day, or a short set of 3 to 5.

## How "puzzle of the day" works

There is no server and no database. Everything happens in the browser:

- `js/daily.js` counts the days since launch (`LAUNCH_DATE`) using **UTC**, so
  the day changes at the same moment for everyone in the world. Day 1 is the
  launch day.
- `data/fossils.json` is the **schedule**: entry 1 is day 1, entry 2 is day 2,
  and so on. To add puzzles, add new fossils to the **end** of the list. Never
  reorder or delete old entries, or past days would change.
- When the list runs out, it starts again from the beginning.
- `daily.js` also has a **seeded random number generator**. Given the same seed
  (today's day number), it gives the same "random" numbers every time, so any
  randomness in a puzzle (for example, which day is a phoney) is the same for
  every player.

## Run it locally

The page loads its data with `fetch`, and browsers block that for pages opened
straight from a file. So start a tiny local web server from this folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Project layout

```
fossil-or-phoney/
├── index.html         the game page
├── css/style.css      pixel-art styling (Jersey 10 + Pixelify Sans)
├── js/daily.js        day number, seeded randomness, today's puzzle
├── js/share.js        builds the emoji result and copies it to the clipboard
├── js/main.js         wires everything into the page
├── data/fossils.json  the puzzle schedule
└── assets/            images (CC0 / public domain only, with credits)
```

## Hosting (planned)

This is plain HTML, CSS and JavaScript with no build step, so it can be hosted
free on GitHub Pages or Cloudflare Pages, for example at
`fossil.jackmarsters.com`.

## Credits

- Fonts: [Jersey 10](https://fonts.google.com/specimen/Jersey+10) and
  [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License).
- Fossil images and facts will be credited here as they are added.
