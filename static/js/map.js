/* ============================================================================
 * map.js
 *
 * Choropleth world map.
 *   Task 4: Render the world map and colour the COUNTRIES by the selected
 *           indicator.
 *   Task 5: Hover -> highlight the corresponding scatter dot.
 *           Click -> add the country to the time series.
 *   Task 6: Re-colour with d3 enter/update on indicator/year change
 *           (no full redraw).
 *   Bonus:  Tooltip with eight indicator values for the most recent year.
 * ==========================================================================*/

const ChoroMap = (function () {

    // -------------- configuration ------------------------------------------
    const WIDTH = 800;
    const HEIGHT = 460;

    // Colour scheme used for "highlight" outlines.
    const HIGHLIGHT_COLOR = "#e63946";
    const STROKE_DEFAULT  = "#666";
    const FILL_NO_DATA    = "#eaeaea";

    // Tooltip indicators (Bonus task: eight variables).
    const TOOLTIP_VARIABLES = [
        "Access to electricity (% of population)",
        "Agricultural irrigated land (% of total agricultural land)",
        "Agricultural land (% of land area)",
        "Average precipitation in depth (mm per year)",
        "Employment in agriculture (% of total employment) (modeled ILO estimate)",
        "GDP per capita (current US$)",
        "Land area (sq. km)",
        "Population, total",
    ];

    // -------------- module state -------------------------------------------
    let state, actions;
    let svg, gMap, projection, pathGen;
    let countriesSel;          // d3 selection of <path> for every country
    let mapData = null;
    let tooltip;

    // Set of ISO3 codes we have data for (-> only those are clickable).
    let codesWithData = new Set();

    // -------------- initialisation -----------------------------------------
    function init(_state, _actions) {
        state = _state;
        actions = _actions;
        codesWithData = new Set(Object.keys(state.rowsByCode));

        svg = d3.select("#svg_map")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);

        gMap = svg.append("g");
        tooltip = d3.select("#map_tooltip");

        // Subscribe to state changes BEFORE we await the topo-json. The
        // first re-render will simply find no paths and skip cleanly.
        App.subscribe(handleStateChange);

        // Load the world topology once. Absolute path so that the request
        // resolves correctly no matter where the page is mounted.
        d3.json("/static/data/world-topo.json").then(function (topo) {
            projection = d3.geoNaturalEarth1()
                .fitSize([WIDTH, HEIGHT - 20], topojson.feature(topo, topo.objects.countries));
            pathGen = d3.geoPath().projection(projection);

            mapData = topojson.feature(topo, topo.objects.countries).features;

            countriesSel = gMap.selectAll("path.country")
                .data(mapData, d => d.properties.id)
                .enter()
                .append("path")
                .attr("class", "country")
                .attr("d", pathGen)
                .attr("stroke", STROKE_DEFAULT)
                .attr("stroke-width", 0.4)
                .attr("fill", FILL_NO_DATA)
                .on("mouseover", function (event, d) {
                    const code = d.properties.id;
                    if (!codesWithData.has(code)) return;
                    actions.setHovered(code);
                    showTooltip(event, code);
                })
                .on("mousemove", function (event) {
                    moveTooltip(event);
                })
                .on("mouseout", function () {
                    actions.setHovered(null);
                    hideTooltip();
                })
                .on("click", function (event, d) {
                    const code = d.properties.id;
                    if (!codesWithData.has(code)) return;
                    actions.toggleClicked(code);
                });

            // First paint
            updateColors();
            updateHighlights();
        });
    }

    // -------------- re-rendering helpers -----------------------------------
    function handleStateChange(_state, reason) {
        if (!countriesSel) return;       // map not yet loaded
        if (reason === "indicator" || reason === "year" || reason === "init") {
            updateColors();
        }
        // Highlights depend on hover / click / brush / clear.
        updateHighlights();
    }

    /**
     * Update the fill colour of each country (Task 4 + Task 6 attribute
     * coordination). Uses an UPDATE selection only - no enter/exit because
     * the set of countries never changes.
     */
    function updateColors() {
        const indicator = state.currentIndicator;
        const year      = state.currentYear;

        const [vmin, vmax] = App.helpers.indicatorExtent(indicator, year);
        const scale = d3.scaleSequential()
            .domain([vmin, vmax])
            .interpolator(d3.interpolateYlGnBu);

        // Update only - no enter / exit needed (countries are static).
        countriesSel.transition().duration(300)
            .attr("fill", function (d) {
                const code = d.properties.id;
                const row = App.helpers.rowFor(code, year);
                if (!row || row[indicator] == null) return FILL_NO_DATA;
                return scale(+row[indicator]);
            });

        // Build / update the legend.
        Legend.render(svg, scale, indicator, vmin, vmax,
                      WIDTH - 230, HEIGHT - 25);
    }

    /**
     * Update stroke / opacity of the countries depending on the current
     * hover and selection state.
     */
    function updateHighlights() {
        const hovered  = state.hoveredCountry;
        const selected = App.helpers.selectedCountries();

        countriesSel
            .classed("highlighted", d => d.properties.id === hovered)
            .classed("selected",    d => selected.has(d.properties.id))
            .attr("stroke", function (d) {
                const code = d.properties.id;
                if (code === hovered)    return HIGHLIGHT_COLOR;
                if (selected.has(code))  return HIGHLIGHT_COLOR;
                return STROKE_DEFAULT;
            })
            .attr("stroke-width", function (d) {
                const code = d.properties.id;
                if (code === hovered || selected.has(code)) return 1.8;
                return 0.4;
            })
            .filter(d => d.properties.id === hovered || selected.has(d.properties.id))
            .raise();   // bring highlighted shapes to the top
    }

    // -------------- tooltip (Bonus) ----------------------------------------
    function showTooltip(event, code) {
        const row = App.helpers.rowFor(code, state.pca.year);
        if (!row) return;

        let html = `<div class="tt_title">${row.Name}</div>`;
        html += '<table class="tt_table">';
        TOOLTIP_VARIABLES.forEach(v => {
            const value = row[v];
            const formatted = (value == null)
                ? "&mdash;"
                : formatValue(+value);
            html += `<tr><td class="tt_var">${v}</td><td class="tt_val">${formatted}</td></tr>`;
        });
        html += "</table>";

        tooltip.html(html)
            .style("opacity", 1);
        moveTooltip(event);
    }

    function moveTooltip(event) {
        const padding = 14;
        let x = event.pageX + padding;
        let y = event.pageY + padding;

        // keep it inside the viewport
        const node = tooltip.node();
        const rect = node.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = event.pageX - rect.width - padding;
        }
        if (y + rect.height > window.innerHeight + window.scrollY) {
            y = event.pageY - rect.height - padding;
        }

        tooltip.style("left", x + "px").style("top", y + "px");
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    function formatValue(v) {
        if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + " B";
        if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + " M";
        if (Math.abs(v) >= 1e3) return d3.format(",.0f")(v);
        if (Math.abs(v) >= 1)   return d3.format(".2f")(v);
        return d3.format(".3f")(v);
    }

    return { init };
})();


/* ----------------------------------------------------------------------------
 * Tiny helper that draws a colour-scale legend inside the given SVG.
 * Implemented as a self-contained module so the same logic can be reused.
 * --------------------------------------------------------------------------*/
const Legend = (function () {

    function render(svg, scale, title, vmin, vmax, x, y) {
        const W = 200;
        const H = 12;
        const id = "legend_gradient";

        // ---- defs ----
        let defs = svg.select("defs");
        if (defs.empty()) defs = svg.append("defs");

        let gradient = defs.select("#" + id);
        if (gradient.empty()) {
            gradient = defs.append("linearGradient").attr("id", id);
        }
        gradient.attr("x1", "0%").attr("x2", "100%")
                .attr("y1", "0%").attr("y2", "0%");

        // Recreate stops every time (cheap).
        gradient.selectAll("stop").remove();
        const N = 10;
        for (let i = 0; i <= N; i++) {
            gradient.append("stop")
                .attr("offset", (i / N * 100) + "%")
                .attr("stop-color", scale(vmin + (i / N) * (vmax - vmin)));
        }

        // ---- group ----
        let g = svg.select("#legend_group");
        if (g.empty()) {
            g = svg.append("g").attr("id", "legend_group");
            g.append("rect").attr("class", "legend_rect")
                .attr("fill", "url(#" + id + ")");
            g.append("text").attr("class", "legend_min");
            g.append("text").attr("class", "legend_max");
            g.append("text").attr("class", "legend_title");
        }
        g.attr("transform", `translate(${x},${y})`);

        g.select("rect.legend_rect")
            .attr("width", W).attr("height", H)
            .attr("y", -H);

        g.select("text.legend_min")
            .attr("x", 0).attr("y", 12)
            .text(d3.format(".2~s")(vmin));

        g.select("text.legend_max")
            .attr("x", W).attr("y", 12)
            .attr("text-anchor", "end")
            .text(d3.format(".2~s")(vmax));

        g.select("text.legend_title")
            .attr("x", W / 2).attr("y", -H - 4)
            .attr("text-anchor", "middle")
            .text(title.length > 60 ? title.slice(0, 57) + "…" : title);
    }

    return { render };
})();
