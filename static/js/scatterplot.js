/** global variables */
let scatterPlotWidth = 400;
let scatterPlotHeight = 500;
let scatterPadding = 50;

/** INIT METHODS */
function initScatterPlot(data_pca) {
  let scatterplot = d3
    .select("#svg_plot")
    .attr("width", scatterPlotWidth)
    .attr("height", scatterPlotHeight);

  let x_axis = d3
    .scaleLinear()
    .domain(d3.extent(data_pca, (d) => d.PC1))
    .range([scatterPadding, scatterPlotWidth - scatterPadding]);
  scatterplot
    .append("g")
    .attr("transform", `translate(0, ${scatterPlotHeight - scatterPadding})`)
    .call(d3.axisBottom(x_axis));

  let y_axis = d3
    .scaleLinear()
    .domain(d3.extent(data_pca, (d) => d.PC2))
    .range([scatterPlotHeight - scatterPadding, scatterPadding]);
  scatterplot.append("g").call(d3.axisLeft(y_axis));

  scatterplot.selectAll("path,line").remove();

  scatterplot
    .call(
      d3
        .brush()
        .extent([
          [0, 0],
          [scatterPlotWidth, scatterPlotHeight],
        ])
        .on("start brush", (event) => {
          if (!event.selection) return;

          d3.select("#svg_plot")
            .selectAll("circle")
            .classed("selected", (d) =>
              isBrushed(event.selection, x_axis(d.PC1), y_axis(d.PC2)),
            );

          const SELECTED_POINTS = d3
            .select("#svg_plot")
            .selectAll("circle")
            .data()
            .filter((d) =>
              isBrushed(event.selection, x_axis(d.PC1), y_axis(d.PC2)),
            )
            .map((d) => d.Code);

          d3.select("#svg_map")
            .selectAll("path")
            .filter((d) => SELECTED_POINTS.includes(d.properties.id))
            .attr("fill", "red");

          updateChart(SELECTED_POINTS);
        })
        .on("end", (event) => {
          if (event.selection) return;

          d3.select("#svg_plot").selectAll("circle").classed("selected", false);
          updateMapColors(
            +d3.select("#yearSlider").property("value"),
            d3.select("#indicator_change").property("value"),
          );
        }),
    )
    .append("g")
    .selectAll("dot")
    .data(data_pca)
    .enter()
    .append("circle")
    .attr("cx", (d) => x_axis(d.PC1))
    .attr("cy", (d) => y_axis(d.PC2))
    .attr("r", 6)
    .attr("stroke", "#333")
    .on("mouseover", (event, d) => {
      onMouseOverScatterPlot(d);
      showTooltip(event, d);
    })
    .on("mousemove", (event) => moveTooltip(event))
    .on("mouseout", hideTooltip);
}

// TODO: keep selected points when changing years or dropdown

/** EVENT HANDLERS */
function onMouseOverScatterPlot(event) {
  d3.select("#svg_plot")
    .selectAll("circle")
    .classed("selected", (d) => d.Code == event.Code);

  d3.select("#svg_map")
    .selectAll("path")
    .attr("fill", (d) => {
      if (d.properties.id == event.Code) return "red";
      return getColor(
        d.properties.id,
        d3.select("#indicator_change").property("value"),
        +d3.select("#yearSlider").property("value") -
          d3.select("#yearSlider").property("min"),
      );
    });
}

/** HELPER FUNCTIONS */
function isBrushed(brush_coords, cx, cy) {
  var x0 = brush_coords[0][0],
    x1 = brush_coords[1][0],
    y0 = brush_coords[0][1],
    y1 = brush_coords[1][1];
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}
