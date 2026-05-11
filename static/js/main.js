/* ============================================================================
 * main.js
 *
 * Central application state and orchestration. Implements a tiny pub/sub
 * mechanism so that each view (map, scatter, time series) can subscribe to
 * state changes and re-render incrementally with the d3 enter/update pattern
 * (Task 6: fully coordinated views).
 * ==========================================================================*/

const App = (function () {

    // ---- shared state ------------------------------------------------------
    const state = {
        // raw / static data
        data: [],                  // all CSV rows (filtered to COUNTRIES)
        pca: null,                 // {year, points, features, ...}
        indicators: [],            // list of indicator names (= numeric columns)
        yearMin: 1960,
        yearMax: 2020,

        // user-controlled state
        currentIndicator: null,    // selected indicator name
        currentYear: 2020,         // selected year (slider)

        // interaction state
        hoveredCountry: null,      // ISO3 code of country currently hovered
        clickedCountries: new Set(), // codes added by clicking the map
        brushedCountries: new Set(), // codes selected by the scatter brush

        // derived helpers (filled in init)
        codeByName: {},            // "Germany" -> "DEU"
        nameByCode: {},            // "DEU"     -> "Germany"
        rowsByCode: {},            // "DEU"     -> [row1960, row1961, ...]
    };

    // ---- subscriber registry ----------------------------------------------
    const listeners = [];

    function subscribe(fn) {
        listeners.push(fn);
    }

    function notify(reason) {
        listeners.forEach(fn => fn(state, reason));
    }

    // ---- public mutators ---------------------------------------------------
    function setIndicator(indicator) {
        if (indicator === state.currentIndicator) return;
        state.currentIndicator = indicator;
        notify("indicator");
    }

    function setYear(year) {
        year = +year;
        if (year === state.currentYear) return;
        state.currentYear = year;
        notify("year");
    }

    function setHovered(code) {
        if (code === state.hoveredCountry) return;
        state.hoveredCountry = code;
        notify("hover");
    }

    function toggleClicked(code) {
        if (state.clickedCountries.has(code)) {
            state.clickedCountries.delete(code);
        } else {
            state.clickedCountries.add(code);
        }
        notify("click");
    }

    function setBrushed(codes) {
        // codes: iterable of ISO3 codes
        state.brushedCountries = new Set(codes);
        notify("brush");
    }

    function clearAllSelections() {
        state.clickedCountries.clear();
        state.brushedCountries.clear();
        notify("clear");
    }

    /**
     * Convenience: set of countries that are "selected" (= shown in time
     * series and highlighted on the map). The union of brush + clicks.
     */
    function selectedCountries() {
        const out = new Set(state.clickedCountries);
        state.brushedCountries.forEach(c => out.add(c));
        return out;
    }

    /**
     * Look up a row for a country (by ISO3) in a specific year. Returns
     * undefined if none is available.
     */
    function rowFor(code, year) {
        const arr = state.rowsByCode[code];
        if (!arr) return undefined;
        return arr.find(r => +r.Year === +year);
    }

    /**
     * Compute the [min, max] range of an indicator across the selected year
     * (used for the colour scale on map and scatter).
     */
    function indicatorExtent(indicator, year) {
        const values = [];
        state.data.forEach(d => {
            if (+d.Year === +year && d[indicator] != null) {
                values.push(+d[indicator]);
            }
        });
        return d3.extent(values);
    }

    // ---- bootstrap ---------------------------------------------------------
    function init(payload) {
        state.data       = payload.data;
        state.pca        = payload.pca;
        state.indicators = payload.indicators;
        state.yearMin    = payload.year_min;
        state.yearMax    = payload.year_max;

        // Build look-up tables once.
        state.data.forEach(row => {
            state.codeByName[row.Name] = row.Code;
            state.nameByCode[row.Code] = row.Name;
            (state.rowsByCode[row.Code] = state.rowsByCode[row.Code] || []).push(row);
        });

        // Default selections.
        state.currentYear = state.pca.year;            // most recent year
        // Pick "Rural population growth (annual %)" if present (matches the
        // example screenshots), otherwise fall back to the first indicator.
        const preferred = "Rural population growth (annual %)";
        state.currentIndicator =
            state.indicators.includes(preferred) ? preferred : state.indicators[0];

        // Initialise sub-modules. Each module subscribes to state changes.
        Controls.init(state, { setIndicator, setYear, clearAllSelections });
        ChoroMap.init(state, { setHovered, toggleClicked });
        Scatter.init(state, { setHovered, setBrushed });
        TimeSeries.init(state, {});

        // Initial paint.
        notify("init");
    }

    // ---- public API --------------------------------------------------------
    return {
        init,
        subscribe,
        // expose helpers for the views
        helpers: {
            selectedCountries,
            rowFor,
            indicatorExtent,
        },
    };
})();
