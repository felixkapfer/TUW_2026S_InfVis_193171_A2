/* ============================================================================
 * controls.js
 *
 * UI controls: indicator dropdown, year slider, clear-selection button.
 * Implements parts of Task 4 (indicator selection) and Task 6 (year slider,
 * attribute coordination).
 * ==========================================================================*/

const Controls = (function () {

    let state, actions;

    function init(_state, _actions) {
        state = _state;
        actions = _actions;

        // ---- indicator dropdown ----
        const select = d3.select("#indicator_change");
        select.selectAll("option")
            .data(state.indicators)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);
        select.property("value", state.currentIndicator);
        select.on("change", function () {
            actions.setIndicator(this.value);
        });

        // ---- year slider ----
        const slider = d3.select("#year_slider")
            .attr("min", state.yearMin)
            .attr("max", state.yearMax)
            .attr("step", 1)
            .attr("value", state.currentYear);

        const yearLabel = d3.select("#year_label").text(state.currentYear);

        slider.on("input", function () {
            yearLabel.text(this.value);
            actions.setYear(this.value);
        });

        // ---- clear-selection button ----
        d3.select("#clear_selection").on("click", function () {
            actions.clearAllSelections();
            // Also clear the brush rectangle in the scatterplot.
            if (window.Scatter && Scatter.clearBrush) Scatter.clearBrush();
        });

        // Stay in sync when year is changed elsewhere.
        App.subscribe(function (s, reason) {
            if (reason === "year" || reason === "init") {
                slider.property("value", s.currentYear);
                yearLabel.text(s.currentYear);
            }
            if (reason === "indicator" || reason === "init") {
                select.property("value", s.currentIndicator);
            }
        });
    }

    return { init };
})();
