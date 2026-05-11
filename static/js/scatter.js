/* ============================================================================
 * scatter.js
 *
 * PCA scatterplot.
 *   Task 3: Render PCA result, dots clearly associated with countries.
 *   Task 5: Hover -> highlight the country on the map.
 *   Task 6: Rectangular brushing (d3.brush). Clearing the brush resets.
 *           Recolours when the indicator changes (attribute coordination).
 *           Uses enter / update only - no full redraw.
 * ==========================================================================*/

const Scatter = (function () {

    // -------------- configuration ------------------------------------------
    const WIDTH  = 540;
    const HEIGHT = 460;
    const MARGIN = { top: 30, right: 20, bottom: 50, left: 50 };

    // -------------- module state -------------------------------------------
    let state, actions;
    let svg, gPlot, gDots, gLabels;
    let xScale, yScale;
    let dotsSel;
    let brush, brushG;

    function init(_state, _actions) {
        state = _state;
        actions = _actions;

        svg = d3.select("#svg_scatter")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);

        gPlot = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const innerW = WIDTH - MARGIN.left - MARGIN.right;
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

        // ---- scales ----
        const xs = state.pca.points.map(p => p.x);
        const ys = state.pca.points.map(p => p.y);
        const xPad = 0.1 * (d3.max(xs) - d3.min(xs));
        const yPad = 0.1 * (d3.max(ys) - d3.min(ys));

        xScale = d3.scaleLinear()
            .domain([d3.min(xs) - xPad, d3.max(xs) + xPad])
            .range([0, innerW]);

        yScale = d3.scaleLinear()
            .domain([d3.min(ys) - yPad, d3.max(ys) + yPad])
            .range([innerH, 0]);

        // ---- axes ----
        gPlot.append("g")
            .attr("class", "axis axis_x")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).ticks(6));

        gPlot.append("g")
            .attr("class", "axis axis_y")
            .call(d3.axisLeft(yScale).ticks(6));

        // ---- axis labels ----
        const ev = state.pca.explained_variance || [0, 0];
        gPlot.append("text")
            .attr("class", "axis_label")
            .attr("x", innerW / 2)
            .attr("y", innerH + 38)
            .attr("text-anchor", "middle")
            .text(`PC 1  (${(ev[0] * 100).toFixed(1)}% variance)`);

        gPlot.append("text")
            .attr("class", "axis_label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2)
            .attr("y", -36)
            .attr("text-anchor", "middle")
            .text(`PC 2  (${(ev[1] * 100).toFixed(1)}% variance)`);

        // ---- brush layer (must be BELOW dots so dots receive mouse events) ----
        brushG = gPlot.append("g").attr("class", "brush");
        brush = d3.brush()
            .extent([[0, 0], [innerW, innerH]])
            .on("brush end", brushed);
        brushG.call(brush);

        // ---- dot layer ----
        gDots = gPlot.append("g").attr("class", "dots");
        gLabels = gPlot.append("g").attr("class", "labels");

        // Initial enter selection (set of points never changes - we only
        // update visual attributes from here on out, fulfilling Task 6's
        // "no full redraw" requirement).
        const data = state.pca.points;

        dotsSel = gDots.selectAll("circle.dot")
            .data(data, d => d.Code)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 6)
            .attr("stroke", "#444")
            .attr("stroke-width", 0.6)
            .on("mouseover", function (event, d) {
                actions.setHovered(d.Code);
            })
            .on("mouseout", function () {
                actions.setHovered(null);
            });

        // Country code labels next to the dots so the association is clear
        // (Task 3 - "association of dots with countries has to be clear").
        gLabels.selectAll("text.dot_label")
            .data(data, d => d.Code)
            .enter()
            .append("text")
            .attr("class", "dot_label")
            .attr("x", d => xScale(d.x) + 7)
            .attr("y", d => yScale(d.y) + 3)
            .text(d => d.Code);

        // Subscribe to state changes.
        App.subscribe(handleStateChange);
    }

    // -------------- brush ---------------------------------------------------
    function brushed(event) {
        const sel = event.selection;
        if (!sel) {
            // Brush cleared.
            actions.setBrushed([]);
            return;
        }
        const [[x0, y0], [x1, y1]] = sel;
        const inside = state.pca.points
            .filter(d => {
                const cx = xScale(d.x);
                const cy = yScale(d.y);
                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            })
            .map(d => d.Code);
        actions.setBrushed(inside);
    }

    function clearBrush() {
        if (brushG && brush) brushG.call(brush.move, null);
    }

    // -------------- update --------------------------------------------------
    function handleStateChange(_state, reason) {
        if (!dotsSel) return;
        // Recolour on indicator change. Recompute on year change, too,
        // because the colour scale uses the currentYear (matches the map).
        if (reason === "indicator" || reason === "year" || reason === "init") {
            updateColors();
        }
        updateHighlights();
    }

    function updateColors() {
        // Colour the dots by the selected indicator value of the PCA's
        // most recent year. Requires the colour scale to be the same as
        // the map for visual coordination.
        const indicator = state.currentIndicator;
        const year = state.pca.year;     // PCA year is fixed (most recent)

        const [vmin, vmax] = App.helpers.indicatorExtent(indicator, year);
        const scale = d3.scaleSequential()
            .domain([vmin, vmax])
            .interpolator(d3.interpolateYlGnBu);

        dotsSel.transition().duration(300)
            .attr("fill", function (d) {
                const row = App.helpers.rowFor(d.Code, year);
                if (!row || row[indicator] == null) return "#cccccc";
                return scale(+row[indicator]);
            });
    }

    function updateHighlights() {
        const hovered  = state.hoveredCountry;
        const selected = App.helpers.selectedCountries();

        dotsSel
            .classed("highlighted", d => d.Code === hovered)
            .classed("selected",    d => selected.has(d.Code))
            .attr("r", function (d) {
                if (d.Code === hovered)        return 10;
                if (selected.has(d.Code))      return 8;
                return 6;
            })
            .attr("stroke", function (d) {
                if (d.Code === hovered)        return "#e63946";
                if (selected.has(d.Code))      return "#e63946";
                return "#444";
            })
            .attr("stroke-width", function (d) {
                if (d.Code === hovered || selected.has(d.Code)) return 2;
                return 0.6;
            });

        // Bring emphasised dots to the front.
        dotsSel.filter(d => d.Code === hovered || selected.has(d.Code)).raise();
    }

    return { init, clearBrush };
})();
