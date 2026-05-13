/** global variables */
let mapWidth = 700;
let mapHeight = 500;
let mapData = null;

let codes = null;
let countryData = null;

/** INIT METHODS */

function initMap(data) {
  codes = Object.entries(data).map((d) => d[0]);
  countryData = data;

  d3.json("../static/data/world-topo.json").then((countries) => {
    let projection = d3
      .geoEqualEarth()
      .scale(180)
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
      .on("mouseover", (event, d) => onMouseOverMap(d))
      .on("click", (event, d) => updateChart([d.properties.id]));

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
    .attr("fill", (d) => getColor(d.properties.id, indicator, YEAR_IDX));

  d3.select("#svg_plot")
    .selectAll("circle")
    .attr("fill", (d) => getColor(d.Code, indicator, YEAR_IDX));
}

/** EVENT HANDLERS */
function onMouseOverMap(event) {
  if (!codes.includes(event.properties.id)) return;

  d3.select("#svg_plot")
    .selectAll("circle")
    .classed("selected", (d) => event.properties.id == d.Code);

  d3.select("#svg_map")
    .selectAll("path")
    .attr("fill", (d) => {
      if (d.properties.id == event.properties.id) return "red";
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
  return !isNaN(val) ? colorScale(val) : "#white";
}


// Tooltip functions




function hideTooltip() {
  tooltip.style("opacity", 0);
}