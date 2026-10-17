# deasil

The front end of [deasil.org](https://deasil.org): writing, photography, and a
collection of small programs, built with Next.js 15, React 19 and MUI 7.
Writing and photos come from Sanity.

## Getting started

```bash
npm install
npm run dev
```

The site runs at http://localhost:3000.

### Environment

Put these in `.env`:

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Writing, Photography | Required |
| `NEXT_PUBLIC_SANITY_DATASET` | Writing, Photography | Required |
| `NEXT_PUBLIC_SANITY_API_TOKEN` | Writing, Photography | |
| `ANTHROPIC_API_KEY` | Altar interpretations | Enables Claude |
| `ALTAR_CLAUDE_MODEL` | Altar interpretations | Default `claude-opus-5-5` |
| `ALTAR_CLAUDE_EFFORT` | Altar interpretations | `low`, `medium` (default) or `high` |
| `OLLAMA_URL` | Altar interpretations | Enables a local Ollama model instead |
| `OLLAMA_MODEL` | Altar interpretations | Default `llama3.1` |
| `ALTAR_AI_PROVIDER` | Altar interpretations | `anthropic` or `ollama`; otherwise picked from whichever key is set |

### Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run aria:scratch` | Bundle the Aria test harness into `public/aria-scratch/` |

### Deployment

Import the GitHub repository into Vercel using the Next.js preset and default
build settings. Configure the required Sanity variables and any optional
server-side keys in Vercel's environment settings; local `.env*` files are not
committed. `NEXT_PUBLIC_*` values are exposed to browsers, so omit the Sanity
token for a public dataset and never use a write-enabled token here.

Keep Next.js and `eslint-config-next` on matching, patched versions and commit
both `package.json` and `package-lock.json` when updating them. Vercel can block
deployment of vulnerable Next.js releases even when the build passes. Push the
updated dependencies to trigger a new deployment; redeploying an older commit
does not update its dependencies.

## Layout

```
src/app/
  writing/      articles, authors, categories (Sanity)
  photos/       galleries and lightbox (Sanity)
  programs/     sundial, aria, altar, glyph, voluspa
  api/          altar/interpret, timezone
  about/
docs/           design notes (aria-plan.md)
```

## Site

The app bar has a share menu (social links, copy link) and a light/dark toggle;
the theme follows the system setting until it is changed.

**Writing** — articles, authors and categories.

**Photography** — galleries with a lightbox (buy, share, metadata, close).

## Programs

### Sundial

Clocks for the cycles of the sky, at any date, time and place.

- **Daily** — sunrise, sunset, solar noon and midnight, with twilight, golden
  hour and blue hour
- **Moon** — phase, distance, previous and next phases and eclipses
- **Year** — the wheel of the year: eight sabbats, seasons and months
- **Astro** — the zodiac, with the sun, moon and planets

Date, time and location can be set by hand, or left to follow now.

### Aria

A generative music tracker. Patterns are written in **scale degrees** rather
than pitches, so changing the key or mode re-voices the whole arrangement
instead of transposing recorded notes.

- Keyboard-first multi-track pattern grid
  - `z x c v b n m ,` enter scale degrees 0–7; `q w e r t y u i` continue an octave up
  - digits enter a degree directly; `[` and `]` shift the entry octave
  - arrows move, Tab changes track, `+` / `−` nudge a note, Space plays
- Arrangement: multiple patterns, an order list, and loop-pattern mode for editing in place
- Per-lane generation: pitch (walk, arpeggio, drone) and rhythm (every,
  euclidean, random) are generated separately, so changing the groove keeps the
  melody. Generation is seeded; **live** re-rolls against the running loop and
  **keep** commits the result as editable notes
- Instruments are node graphs (oscillator, noise, gain, filter, envelope, LFO,
  drive, delay, reverb, pan) wired on a canvas
- Oscilloscope, spectrum and peak meter on the master bus
- Autosave, JSON import/export, WAV render

The audio engine in `programs/aria/audio/` imports nothing from React, so the
same code drives an `OfflineAudioContext` to render WAV faster than real time,
and the scheduler can run ahead of the audio clock without waiting on a render.

Instruments split at the amplitude envelope: everything upstream is built per
note, everything downstream is shared by the instrument. That is the difference
between one reverb per instrument and one per note.

Design and reasoning: [docs/aria-plan.md](docs/aria-plan.md).

### Altar

Divination with tarot, runes and ogham.

- Several spreads at once, with grid and list views and optional reversals
- An optional message seeds the draw (with the oracle, spread and date), so the
  same question gives the same answer that day; without one, draws use crypto randomness
- **Interpret** streams a reading from Claude or Ollama via `/api/altar/interpret`
- Browse the full set of cards and symbols
- Readings are saved in the URL

Tarot data:
[Tarot Deck](https://www.kaggle.com/datasets/lsind18/tarot-json/data) and
[Tarotoo Tarot Card Meanings](https://www.kaggle.com/datasets/tarotoo/tarotoo-tarot-card-meanings) (Kaggle).

### Glyph

Write English in old alphabets: Elder, Younger, short-twig, staveless and
Anglo-Saxon futhark, the medieval runerow, and ogham. Rune meanings come from
the [rune poems](https://en.wikipedia.org/wiki/Rune_poem). Transliteration, not
historical reconstruction.

### Voluspa

The Völuspá in several translations, read as a whole, stanza by stanza, or side
by side.

## Todo

**Site**
- Floating, collapsible table of contents for articles
- Show the six most recent photos on the photos page; group photos by location

**Sundial**
- More clocks: day of the week, tides
- Add, reorder and remove clocks; map embed
- Download a clock (or all of them) as SVG
- Save state to the URL

**Aria**
- List view of an instrument graph as an alternative to the canvas
- Move the assertions in `public/aria-scratch/` to a real test runner
- Web MIDI input, MIDI file export
- Effect columns (arpeggio, portamento, retrigger)
- Microtonal scales (the tuning layer already supports them)
- A small live-coding expression field per track

**Altar**
- Quantum random number source
- More decks: Lenormand, playing cards with tarot correspondences
- Filter the card browser by arcana or element
- Info panel: instructions and data sources
- Consistent design across tarot, runes and ogham

**Glyph**
- Greek alphabet; preset words and names (Thor, Odin, Cernunnos, χάος, river, earth, time)
  shown in English, romanized and original

**Voluspa**
- Icons instead of text for the view switcher, in one row with the stanza arrows
- Expand/collapse stanzas in the comparison view
- Check stanza alignment across translations; format the introductions
- Clearer citations
