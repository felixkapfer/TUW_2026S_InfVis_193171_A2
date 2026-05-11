# InfoVis VU 2026 – Exercise 2: Linked View with d3

Multiple coordinated views (PCA scatterplot, choropleth map, time series)
using a Python / Flask backend and d3 v7 in the frontend.

## How to run

1. (Recommended) Create a virtual environment.
   ```
   python -m venv venv
   source venv/bin/activate          # macOS / Linux
   venv\Scripts\activate             # Windows
   ```
2. Install the dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Start the Flask server from the project root (where `app.py` lives):
   ```
   python app.py
   ```
4. Open `http://127.0.0.1:5000/` in your browser.

> If you launch from PyCharm, make sure the working directory is set to the
> project root, otherwise the CSV cannot be found.

## Project structure

```
.
├── app.py                              # Flask backend (Tasks 1 + 2)
├── README.md                           # this file
├── requirements.txt
├── static
│   ├── data
│   │   ├── agriRuralDevelopment_clean.csv   # cleaned dataset from Exercise 1
│   │   └── world-topo.json                  # world map (TopoJSON)
│   ├── js
│   │   ├── main.js                     # shared state + pub/sub
│   │   ├── controls.js                 # indicator dropdown + year slider
│   │   ├── map.js                      # choropleth map + tooltip
│   │   ├── scatter.js                  # PCA scatterplot + brushing
│   │   └── timeseries.js               # time-series line plot
│   └── styles
│       └── style.css
└── templates
    └── index.html
```

## Implemented tasks

| Task | Description | Where |
|------|-------------|-------|
| 1 | Load CSV, filter to `COUNTRIES`, send to client via Jinja2 | `app.py :: load_filtered_data`, `index.html` |
| 2 | PCA on most recent year with `StandardScaler` + `PCA` (sklearn); 2D coords + explained variance + loadings sent to client | `app.py :: compute_pca` |
| 3 | PCA scatterplot with country code labels next to each dot | `static/js/scatter.js` |
| 4 | Choropleth map with sequential colour scale (`d3.interpolateYlGnBu`); indicator dropdown selects the variable | `static/js/map.js`, `static/js/controls.js` |
| 5 | Hover scatter ⇄ map highlight; click on map adds country to time series (1960 – 2020) | `static/js/{map,scatter,timeseries}.js` |
| 6 | Rectangular `d3.brush` on scatter, year slider, attribute coordination across all views — implemented with the d3 `enter / update / exit` pattern (no full redraws) | `static/js/{main,scatter,map,timeseries,controls}.js` |
| Bonus | Tooltip showing 8 indicator values for the most recent year on map hover | `static/js/map.js :: showTooltip` |

## Architecture (frontend)

The frontend uses a tiny pub/sub pattern in `main.js`:

* a single shared `state` object holds the current indicator, year, hover,
  click and brush selections,
* every view (`map.js`, `scatter.js`, `timeseries.js`) subscribes to state
  changes via `App.subscribe`,
* views update themselves with the d3 `enter / update / exit` pattern – the
  set of countries / dots is created once, subsequent state changes only
  modify visual attributes (fills, strokes, positions). This satisfies the
  "no full redraw" requirement of Task 6.

## Notes

* d3 version: **v7** (as set up by the scaffold). Some v3/v4 examples on
  the internet are not directly compatible.
* The colour scale used for the map fills is reused for the scatterplot
  dot colour, so the two views share a consistent visual encoding.
