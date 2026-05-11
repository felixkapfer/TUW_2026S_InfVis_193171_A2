/* ============================================================================
 * timeseries.js
 *
 * Line plot showing the indicator value across 1960-2020 for one or more
 * selected countries.
 *   Task 5: Click on a country in the map -> draw a line for that country.
 *   Task 6: All brushed countries are shown together. The current year is
 *           displayed as a vertical guide line that moves with the slider.
 *           Implemented with the d3 join (enter / update / exit) pattern.
 * ==========================================================================*/

const TimeSeries = (function () {

    // -------------- configuration ------------------------------------------
    const WIDTH  = 1380;
    const HEIGHT = 360;
    const MARGIN = { top: 30, right: 220, bottom: 40, left: 60 };

    // Categorical palette for the line colours.
    const COLOR = d3.scaleOrdinal(d3.schemeCategory10);

    // -------------- module state -------------------------------------------
    let state;
    let svg, g, innerW, innerH;
    let xScale, yScale;
    let xAxisG, yAxisG, yAxisLabel, plotTitle;
    let yearMarker;
    let legendG;

    function init(_state) {
        state = _state;

        svg = d3.select("#svg_line_plot")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);

        g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        innerW = WIDTH - MARGIN.left - MARGIN.right;
        innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

        xScale = d3.scaleLinear()
            .domain([state.yearMin, state.yearMax])
            .range([0, innerW]);

        yScale = d3.scaleLinear().range([innerH, 0]);

        // Axes (created once, only updated afterwards)
        xAxisG = g.append("g")
            .attr("class", "axis axis_x")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10));

        yAxisG = g.append("g")
            .attr("class", "axis axis_y");

        // Axis labels
        g.append("text")
            .attr("class", "axis_label")
            .attr("x", innerW / 2)
            .attr("y", innerH + 32)
            .attr("text-anchor", "middle")
            .text("Year");

        yAxisLabel = g.append("text")
            .attr("class", "axis_label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2)
            .attr("y", -45)
            .attr("text-anchor", "middle");

        // Year marker (vertical line that follows the slider)
        yearMarker = g.append("line")
            .attr("class", "year_marker")
            .attr("y1", 0).attr("y2", innerH);

        // Plot title
        plotTitle = svg.append("text")
            .attr("class", "ts_title")
            .attr("x", WIDTH / 2)
            .attr("y", 18)
            .attr("text-anchor", "middle");

        // Legend group
        legendG = svg.append("g")
            .attr("class", "ts_legend")
            .attr("transform",
                  `translate(${MARGIN.left + innerW + 16},${MARGIN.top})`);

        // Subscribe to state changes
        App.subscribe(update);
    }

    /**
     * Re-draw the chart in response to a state change. We use the d3 join
     * pattern, so existing paths are updated in place and only new lines
     * are appended (Task 6).
     */
    function update(s, reason) {
        if (!g) return;

        const indicator = s.currentIndicator;
        const selected = Array.from(App.helpers.selectedCountries());

        // ---- title ---------------------------------------------------------
        if (selected.length === 0) {
            plotTitle.text(`${indicator} — click a country or brush in the scatterplot`);
        } else {
            plotTitle.text(`${indicator} for selected countries`);
        }
        yAxisLabel.text(indicator.length > 50 ? indicator.slice(0, 47) + "…" : indicator);

        // ---- y scale (depends on indicator + the active selection) --------
        // Use the global range of the indicator across all years/countries
        // for a stable y axis - this avoids axis jitter when the selection
        // changes.
        const allValues = [];
        s.data.forEach(row => {
            const v = row[indicator];
            if (v != null && !isNaN(+v)) allValues.push(+v);
        });
        const [vmin, vmax] = d3.extent(allValues);
        const padding = 0.05 * (vmax - vmin || 1);
        yScale.domain([vmin - padding, vmax + padding]);

        yAxisG.transition().duration(250)
            .call(d3.axisLeft(yScale).ticks(8));

        // ---- year marker ---------------------------------------------------
        yearMarker.transition().duration(150)
            .attr("x1", xScale(s.currentYear))
            .attr("x2", xScale(s.currentYear));

        // ---- one line per selected country (enter / update / exit) --------
        const lineGen = d3.line()
            .x(d => xScale(+d.Year))
            .y(d => yScale(+d[indicator]))
            .defined(d => d[indicator] != null && !isNaN(+d[indicator]));

        // Build the data: rows of selected countries, sorted by year.
        const seriesData = selected.map(code => ({
            code,
            name: s.nameByCode[code],
            rows: (s.rowsByCode[code] || []).slice().sort((a, b) => +a.Year - +b.Year),
        }));

        // PATHS ---------------------------------------------------------
        const paths = g.selectAll("path.country_line")
            .data(seriesData, d => d.code);

        paths.exit().remove();

        const pathsEnter = paths.enter()
            .append("path")
            .attr("class", "country_line")
            .attr("fill", "none")
            .attr("stroke-width", 2);

        pathsEnter.merge(paths)
            .attr("stroke", d => COLOR(d.code))
            .transition().duration(300)
            .attr("d", d => lineGen(d.rows));

        // CURRENT-YEAR DOTS --------------------------------------------
        const dots = g.selectAll("circle.year_dot")
            .data(seriesData, d => d.code);

        dots.exit().remove();

        dots.enter()
            .append("circle")
            .attr("class", "year_dot")
            .attr("r", 4)
            .merge(dots)
            .attr("fill", d => COLOR(d.code))
            .transition().duration(300)
            .attr("cx", d => xScale(s.currentYear))
            .attr("cy", function (d) {
                const row = App.helpers.rowFor(d.code, s.currentYear);
                if (!row || row[indicator] == null) return -100;
                return yScale(+row[indicator]);
            });

        // LEGEND -------------------------------------------------------
        const legendItems = legendG.selectAll("g.legend_item")
            .data(seriesData, d => d.code);

        legendItems.exit().remove();

        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend_item");

        legendEnter.append("rect")
            .attr("width", 12).attr("height", 12);

        legendEnter.append("text")
            .attr("x", 18).attr("y", 10);

        const legendMerged = legendEnter.merge(legendItems)
            .attr("transform", (_, i) => `translate(0,${i * 18})`);

        legendMerged.select("rect").attr("fill", d => COLOR(d.code));
        legendMerged.select("text").text(d => d.name);
    }

    return { init };
})();
