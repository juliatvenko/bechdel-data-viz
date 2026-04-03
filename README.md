# The Bechdel Test — Data Visualization

An interactive data visualization exploring 150 years of cinema through the Bechdel Test. Built with D3.js and plain HTML/CSS/JavaScript.

**Live preview:** `https://juliatvenko.github.io/bechdel-data-viz/`.

---

## What is the Bechdel Test

The Bechdel Test checks whether a film has at least two named women who talk to each other about something other than a man. It was first described in a 1985 comic strip by Alison Bechdel. The test does not measure quality — it only checks basic presence.

---

## Charts

| # | Chart | Type | Question |
|---|-------|------|----------|
| 1 | Decade breakdown | 100% stacked bar | How has the pass/fail split changed over time? |
| 2 | Trend over time | Line + OLS regression | Is there an upward trend since 1960? |
| 3 | Genre breakdown | Radial bar | Which genres pass the test most often? |
| 4 | IMDb vs Bechdel | Scatter plot | Do audiences rate inclusive films differently? |

All charts have **All / 1970–2020 / 1990–2020** period filters. Charts redraw on window resize.

---

## Project structure

```
├── index.html          # Page layout and text
├── style.css           # Styles and responsive rules
├── main.js             # Data loading, aggregation, filter wiring
├── charts/
│   ├── shared.js       # Shared constants (colors, margins, tooltip)
│   ├── bar.js          # Chart 1 — stacked bar
│   ├── line.js         # Chart 2 — line chart with regression
│   ├── radial.js       # Chart 3 — radial bar
│   └── scatter.js      # Chart 4 — scatter plot
└── data/
    ├── Bechdel.csv     # Main dataset (10 703 films)
    ├── scrape.py       # Fetches raw data from bechdeltest.com and IMDb
    ├── clean.py        # Merges and cleans the raw data
    └── requirements.txt
```

---

## Data

- **Source:** [bechdeltest.com](https://bechdeltest.com) and [IMDb](https://www.imdb.com)
- **Size:** 10 703 films, 1874–2026
- **Key columns:** `year`, `title`, `rating` (0–3), `genres`, `averageRating`, `numVotes`

The `rating` column encodes how far a film got on the test:

| Rating | Meaning |
|--------|---------|
| 3 | Passes — two named women talk about something other than a man |
| 2 | Two women present but they only talk about men |
| 1 | Only one named woman |
| 0 | No women at all |

---

## Data pipeline

Requires Python 3.9+ and a conda or virtual environment.

```bash
cd data
pip install -r requirements.txt
python scrape.py   # fetches raw data → bechdel_raw.csv
python clean.py    # merges IMDb data → Bechdel.csv
```

---

## Running the site

The page loads `data/Bechdel.csv` via `d3.csv`, so it must be served over HTTP (not opened as a local file).

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Tech stack

- [D3.js v7](https://d3js.org) — all charts
- Vanilla HTML / CSS / JavaScript — no build step
- Python + pandas — data pipeline
