# Arrow Maze - Play Store listing copy

Paste-ready text for the Google Play Console, with the research it rests on.
Character counts below were computed, not estimated, and every field is inside
Play's limit (30 / 80 / 4,000).

---

## What the research found

### 1. Six direct competitors, pulled from Play on 22 Sep 2026

| App (developer) | Rating | Reviews | Installs | Short description |
|---|---|---|---|---|
| Arrows - Puzzle Escape (Lessmore) | 4.7 | 2.1M | 100M+ | Clear all the arrows! Solve logic puzzles and test your brain in this fun game! |
| Arrow Puzzle: Tap Puzzle Games (Easybrain) | 4.8 | 1.4M | 50M+ | Tap away arrows to escape the maze. Train your brain with smart puzzle games! |
| Tap Away: Tap Puzzle Game | 4.2 | 4.9K | 1M+ | Tap arrows to clear the path! Solve logic puzzles and relax with Tap Away. |
| Arrow Away : Tap Maze | 4.7 | 1.7K | 10K+ | Tap the twisted arrows in correct order to unblock the jam and clear the maze. |
| Arrow Clear: Tap to Escape | 4.1 | - | 10K+ | Tap arrows in the right order, clear the board, and help them escape! |
| Arrow Escape: Tap Away Puzzle | 4.6 | - | 5K+ | Tap in the right order, escape mazes & solve addictive puzzles! |

The two category leaders (150M installs between them) both keep the brand word
first, use a colon, and spend the rest of the 30 characters on `puzzle` +
`escape` or `tap` + `puzzle`. Neither uses an emoji, a claim, or "free".

### 2. Vocabulary the whole genre shares

Document frequency across the six full descriptions (out of 6):

- 6/6: `arrow`, `puzzle`, `logic`, `relaxing`, `clear`, `simple`
- 5/6: `tap`, `board`, `order`, `brain`, `escape`, `satisfying`, `clean`, `level`
- 4/6: `minimalist`, `spatial`, `grid`, `hints`, `no pressure`, `own pace`, `strategy`

Most repeated two-word phrases: `puzzle game`, `how to play`, `clear the board`,
`own pace`, `spatial thinking`, `right order`, `tap away`, `arrow puzzle`,
`logic puzzle`, `helpful hints`, `path is clear`.

These are the words players who play this genre already type. The copy below uses
them on purpose. It is not copying any one listing; it is speaking the genre's
language.

### 3. What each candidate keyword actually returns in Play search

| Query | What ranks | Verdict for us |
|---|---|---|
| `arrow puzzle` | Lessmore #1, Easybrain #2, then ~10 apps literally named "Arrow Puzzle" | Highest-intent term for our exact mechanic. Impossible to own, essential to be indexed for. |
| `arrow escape` | Lessmore, Easybrain, then a dense field of "Arrow Escape: ..." titles | Second strongest genre term. `escape` appears in 5/6 competitor listings. |
| `arrow maze` | **15 apps already titled "Arrow Maze ..."** including "Arrow Maze - Puzzle Escape", "Arrow Maze: Tap Away", "Arrow Maze: Arrow Out" | Our brand name is not a differentiator. The second half of the title has to do the work, and it must not copy a combo that is already taken. |
| `tap away` | Almost entirely 3D block games (Tap It Away, Tap Block Away 3D, Tap Away Decor) | Different sub-genre. Worth a couple of mentions in the body for indexing, not worth title space. |
| `unblock puzzle` | Unblock Me and sliding-block clones, top to bottom | Wrong intent entirely. The previous draft's title targeted this term; that was a mistake and it is gone. |
| `maze puzzle game` | Classic wall mazes, kids' mazes, Tomb of the Mask | Our name puts us here whether we like it or not; the body clarifies what kind of maze this is. |

### 4. How Play weighs the fields

Title carries by far the most ranking weight, short description next (with extra
weight on words near its start), full description least but still indexed. The
practical guidance that recurs across ASO sources: lead each field with the
strongest term, and in the body aim for roughly one exact-match keyword per ~250
characters, written for humans.

### 5. What Play's policy forbids (so the copy avoids it)

From Google's Metadata policy and store-listing best practices:

- No "free", "no ads", "#1", "best", "top", "popular", awards or rankings in
  the title, icon or developer name.
- No ALL CAPS in the title unless it is the brand, no emojis or repeated symbols.
- No keyword blocks or word lists in the description ("car racing, car driving,
  race cars..." is Google's own example of what gets flagged).
- No unattributed testimonials, no comparisons of data with other apps.
- Full description renders plain text only: line breaks work, HTML does not.
  Emoji are permitted in the full description but Google asks that they be
  relevant; this copy uses plain bullets instead, which is what the 100M-install
  leader does.

Two competitor listings above ("Download NOW for FREE", "the most addictive ...
on the Google Play Store") are in breach of these rules. Do not imitate them.

### 6. What is true about our game (checked against the code)

- Levels are procedurally generated with no upper bound. There are **no**
  hand-authored levels in the build, so "handcrafted" must not appear.
- Difficulty labels shown to players are Easy / Medium / Hard (three, not four).
- Boards start at 16 columns and grow to 40 x 64 (2,560 cells) with long L/Z
  shaped tails. No competitor listing describes anything like this. It is our
  single clearest differentiator and the copy leads its second section with it.
- Three tries per level, three-star scoring, hints, pinch-zoom, haptics, light /
  dark / system theme, offline play, on-device progress. All true as of this
  commit. Hints and the extra try are ad-supported; the copy says hints exist
  and does not promise they are free.

---

## App name (30 char limit)

```
Arrow Maze: Tap Escape Puzzle
```

_29 characters._ `Arrow Maze` first because that is the brand and the
first word gets the most weight. `Tap`, `Escape` and `Puzzle` are three of the
five most-used genre tokens, and this exact combination is not used by any of
the 15 "Arrow Maze" apps already on Play, so it cannot be read as imitating one.

Alternatives, all within 30 characters and all unclaimed by existing "Arrow Maze"
titles:

- `Arrow Maze: Arrow Puzzle Game` (29)
- `Arrow Maze - Tap Arrows Away` (28)
- `Arrow Maze: Logic Puzzle Game` (29)

The first alternative targets `arrow puzzle` exactly, which is the strongest
query, at the cost of repeating "arrow" (Easybrain repeats "puzzle" the same way
and it has not hurt them). Play does not allow the title itself to be A/B
tested, so pick one and keep it; changing the title later resets its ranking
history.

---

## Short description (80 char limit)

```
Tap arrows to escape the maze. Relaxing arrow puzzle with endless logic levels.
```

_79 characters._ Opens with the core verb and the two highest-value
terms (`arrows`, `escape`, `maze`) inside the first 40 characters, where Play
weights them most, then adds `arrow puzzle`, `relaxing`, `logic` and the
differentiator `endless`.

Alternatives for an A/B experiment:

- `Arrow puzzle game: tap arrows in the right order to clear the maze. No timer.` (77)
- `Clear every arrow from a maze that never stops growing. Calm, offline, endless.` (79)

---

## Full description (4000 char limit)

```
Arrow Maze is a relaxing arrow puzzle game with one rule: tap an arrow and it slides off the board in the direction it points, but only if nothing is in its way. Help every arrow escape and the level is done.

Easy to learn. Hard to put down.

HOW TO PLAY
• Tap any arrow to send it flying in the direction it points.
• An arrow can only escape when its path to the edge is completely clear.
• Tap a blocked arrow and it bumps, turns red, and costs one of your three tries.
• Clear whatever was in its way and the blocked arrow slides out by itself.
• Empty the whole board to win the level and earn up to three stars.

A MAZE THAT KEEPS GROWING
Most tap away arrow games stay on a small grid. This arrow puzzle does not. Boards start at 16 cells wide and grow level by level to 40 by 64, more than 2,500 cells, filled with long winding arrows that twist in L and Z shapes like a hand drawn maze. Pinch to zoom in on a corner, drag to pan across the board, and untangle it one arrow at a time.

FEATURES
• Endless levels. Every board is generated for its level number, so there is always a next puzzle and it is always a little bigger and a little harder than the last.
• Easy, Medium and Hard difficulty stages as the levels climb.
• Three star scoring that rewards a clean, mistake free solve.
• Hints that highlight an arrow that can escape right now, whenever you are truly stuck.
• Pinch to zoom and drag to pan on the big late game mazes.
• Light and dark themes, plus a System option that follows your phone.
• Satisfying haptics and smooth sliding animations on every move.
• Plays offline with no account and no sign up.
• Progress saves automatically on your device.

A REAL LOGIC WORKOUT
Every level is a logic puzzle in disguise. Work out which arrow has to leave first, which one is blocking three others, and which tap traps you with no way out. Solving each arrow puzzle is a genuine test of planning, spatial thinking and patience, good for a five minute break or a long evening session.

IF YOU LIKE THESE, YOU WILL LIKE ARROW MAZE
• Tap away and arrow escape puzzles
• Maze and labyrinth games
• Logic puzzles, brain teasers and brain training games
• Untangle and unblock style puzzles
• Calm, relaxing games you can play one handed with no timer

NO PRESSURE
There is no clock and no countdown. Take as long as you need, restart a level whenever you like, and play this relaxing arrow puzzle at your own pace.

Download Arrow Maze and see how deep into the maze you can get.

Privacy Policy: https://jacko773.github.io/Maze/privacy-policy.html
Terms of Service: https://jacko773.github.io/Maze/terms.html
```

_2,624 characters, leaving ~1,376 for seasonal additions._

Keyword occurrences in the body. At 2,624 characters the "one exact match
per ~250 characters" guideline works out to about 10 mentions for the
single primary term; the counts below spread that budget across the primary
term and its genre variants instead of hammering one phrase, which is what the
policy's "repetitive keywords" clause is written against:

- `arrow puzzle`: 4
- `escape`: 4
- `tap away`: 2
- `maze`: 10
- `logic`: 3
- `relaxing`: 3
- `brain`: 2
- `spatial`: 1
- `no timer / no clock`: 2
- `offline`: 1
- `endless`: 1
- `hint`: 1
- `untangle`: 2
- `unblock`: 1
- `puzzle (any form)`: 9
- `arrow (any form)`: 19

Everything appears in a sentence, never as a list of terms, so it reads as
description rather than stuffing. "unblock" and "untangle" sit in the "if you
like these" section, which is the honest way to be indexed for adjacent genres
without claiming to be one.

---

## Rollout checklist

1. **Store Listing Experiments**: Play lets you A/B the icon, short description,
   and full description (title cannot be tested). Start with the two short
   descriptions above; it is the highest-weight field you are allowed to test.
2. **Screenshots**: lead with a mid-solve Hard board, zoomed so the winding tails
   are visible. That image is the differentiator no competitor can show. Include
   one dark-mode capture now that the theme exists.
3. **Contains ads** label stays on, and the data-safety form declares the AdMob
   advertising identifier.
4. **Privacy Policy URL** in Console: https://jacko773.github.io/Maze/privacy-policy.html
   **Terms URL** (also linked in-app): https://jacko773.github.io/Maze/terms.html
   Both must be live on GitHub Pages before the listing goes public.
5. Revisit the competitor table in three months. The "Arrow Maze" title space
   gained several entrants in 2026 and is likely to keep filling.
