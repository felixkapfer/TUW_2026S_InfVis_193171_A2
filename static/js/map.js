/** global variables */
let mapWidth = 700;
let mapHeight = 550;
let mapData = null;

let codes = null;
let countryData = null;
let clickedCountry = null;

let tooltip;

/** INIT METHODS */

function initMap(data) {
  codes = Object.entries(data).map((d) => d[0]);
  countryData = data;

  // Tooltip initialization
  initTooltip();

  d3.json("../static/data/world-topo.json").then((countries) => {
    let projection = d3
      .geoEqualEarth()
      .scale(135)
      .translate([mapWidth / 2, mapHeight / 2]);

    let path = d3.geoPath().projection(projection);

    let svg = d3
      .select("#svg_map")
      .attr("width", mapWidth)
      .attr("height", mapHeight);

    mapData = topojson.feature(countries, countries.objects.countries).features;

    let map = svg
      .append("g")
      .selectAll("path")
      .data(mapData)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .attr("fill", "white")
      .on("mouseover", (event, d) => {
          const hasActiveBrush = d3.brushSelection(d3.select("#svg_plot").node());
          if (!hasActiveBrush) {
            onMouseOverMap(d);
          }
          showTooltip(event, d);
        })
      .on("mousemove", event => moveTooltip(event))
      .on("mouseout", () => {
          const hasActiveBrush = d3.brushSelection(d3.select("#svg_plot").node());
          if (!hasActiveBrush) {
            onMouseOut();
          }
          hideTooltip();
      })
      .on("click", (event, d) => {
        if (countryData[d.properties.id]) {
          if (clickedCountry === d.properties.id) {
            clickedCountry = null;
            updateChart([]);
          } else {
            clickedCountry = d.properties.id;
            updateChart([d.properties.id]);
          }
          onMouseOut(); 
        }
      })
    updateMapColors(
      +d3.select("#yearSlider").property("value"),
      d3.select("#indicator_change").property("value"),
    );
  });
}

function updateMapColors(year, indicator) {
  const YEAR_IDX = year - d3.select("#yearSlider").property("min");
  const VALUES = codes
    .map((code) => +countryData[code][indicator][YEAR_IDX])
    .filter((v) => !isNaN(v));

  colorScale = d3
    .scaleSequential((t) => d3.interpolateBlues(0.25 + t * 0.75))
    .domain(d3.extent(VALUES));

  d3.select("#svg_map")
    .selectAll("path")
    .attr("fill", (d) => {
      if (d.properties.id === clickedCountry) return "red";
      return getColor(d.properties.id, indicator, YEAR_IDX);
    }); 

  d3.select("#svg_plot")
    .selectAll("circle")
    .attr("fill", (d) => getColor(d.Code, indicator, YEAR_IDX));
}

/** EVENT HANDLERS */
function onMouseOverMap(event) {
  if (!codes.includes(event.properties.id)) return;

  d3.select("#svg_plot")
    .selectAll("circle")
    .classed("selected", (d) => event.properties.id == d.Code || d.Code === clickedCountry);

  d3.select("#svg_map")
    .selectAll("path")
    .attr("fill", (d) => {
      if (d.properties.id == event.properties.id) return "red";
      if (d.properties.id === clickedCountry) return "red";
      return getColor(
        d.properties.id,
        d3.select("#indicator_change").property("value"),
        +d3.select("#yearSlider").property("value") -
          d3.select("#yearSlider").property("min"),
      );
    });
}

// TODO: delete?
function onMouseOut() {
  d3.select("#svg_plot").selectAll("circle").classed("selected", false);

  updateMapColors(
    +d3.select("#yearSlider").property("value"),
    d3.select("#indicator_change").property("value"),
  );
}

/** HELPER FUNCTIONS */
function getColor(code, indicator, yearIdx) {
  if (!codes.includes(code)) return "white";

  let val = +countryData[code][indicator][yearIdx];
  return !isNaN(val) ? colorScale(val) : "white";
}

// ###################
// Tooltip functions
// ###################

function initTooltip() {
  tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
}

function showTooltip(event, countryFeature) {

  // Get the country ID
  const id = countryFeature.properties ? countryFeature.properties.id : countryFeature.Code;  // Handle both map and scatterplot cases
  if (!countryData[id]) return;               // If no data for this country, do not show tooltip


  const year = +d3.select("#yearSlider").property("value");               // Get the selected year from the slider
  const yearIdx = year - +d3.select("#yearSlider").property("min");       // Calculate the index for the data arrays based on the slider's min value
  const indicators = Object.keys(countryData[id]).filter(k => k != "name").slice(0, 8);  // Get the list of indicators for this country, excluding the "name" property and limiting to the first 8 indicators

  // Construct the HTML content for the tooltip, including the country name, year, and indicator values
  tooltip
    .html(
      `<b>${countryData[id].name}</b><br>${year}<br>` +
      indicators.map(k => `${k}: ${countryData[id][k][yearIdx]}`).join("<br>")
    )
    .style("left", event.pageX + 12 + "px")
    .style("top", event.pageY + 12 + "px")
    .style("opacity", 1);
}


function moveTooltip(event) {
  tooltip
    .style("left", event.pageX + 12 + "px")
    .style("top", event.pageY + 12 + "px");
}


function hideTooltip() {
  tooltip.style("opacity", 0);
}
