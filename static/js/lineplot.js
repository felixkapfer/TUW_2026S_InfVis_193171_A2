/** global variables */
const margin = { top: 40, right: 160, bottom: 30, left: 60 };
let linePlotWidth = 1000 - margin.left - margin.right;
let linePlotHeight = 500 - margin.top - margin.bottom;

// TODO: refactor to avoid global variables
let lineSvg = null;
let xAxis = null;
let yAxis = null;
let lineX = null;
const color = d3.scaleOrdinal(d3.schemeCategory10);

/** INIT METHODS */
function initLinePlot(data) {
  lineSvg = d3
    .select("#svg_line_plot")
    .append("svg")
    .attr("width", linePlotWidth + margin.left + margin.right)
    .attr("height", linePlotHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  xAxis = lineSvg.append("g").attr("transform", `translate(0,${linePlotHeight})`);
  yAxis = lineSvg.append("g");
}

function updateChart(ds) {
  if (ds.length === 0) {
      lineSvg.selectAll(".line, .legend-item").remove(); 
      return;
    }

  const INDICATOR = d3.select("#indicator_change").property("value");
  const MIN_YEAR = +d3.select("#yearSlider").property("min");
  const MAX_YEAR = +d3.select("#yearSlider").property("max");
  const YEARS = d3.range(MIN_YEAR, MAX_YEAR + 1);

  const series = ds
    .filter(id => countryData[id])
    .map(id => ({
      id,
      values: YEARS
        .map((year, i) => ({ date: new Date(year, 0, 1), value: +countryData[id][INDICATOR][i] }))
        .filter(d => !isNaN(d.value)),
    }));

  lineX = d3.scaleTime()
    .domain([new Date(MIN_YEAR, 0, 1), new Date(MAX_YEAR, 0, 1)])
    .range([0, linePlotWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, s => d3.max(s.values, d => d.value))])
    .nice()
    .range([linePlotHeight, 0]);

  xAxis.call(d3.axisBottom(lineX));
  yAxis.call(d3.axisLeft(y));

  lineSvg.selectAll(".chart-title")
    .data([INDICATOR])
    .join("text")
    .attr("class", "chart-title")
    .attr("x", linePlotWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("font-weight", "bold")
    .attr("fill", "#222")
    .text(d => d);

  lineSvg.selectAll(".legend-item")
    .data(series, d => d.id)
    .join(enter => {
      const g = enter.append("g").attr("class", "legend-item");
      g.append("rect").attr("width", 12).attr("height", 12).attr("y", -10);
      g.append("text").attr("x", 18).attr("font-size", 11).attr("fill", "#333");
      return g;
    })
    .attr("transform", (d, i) => `translate(${linePlotWidth + 10}, ${i * 20})`)
    .call(g => {
      g.select("rect").style("fill", d => color(d.id));
      g.select("text").text(d => countryData[d.id]?.name ?? d.id);
    });

  const line = d3.line().x(d => lineX(d.date)).y(d => y(d.value));

  lineSvg.selectAll(".line")
    .data(series, d => d.id)
    .join("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .style("stroke", d => color(d.id))
    .attr("d", d => line(d.values));

  updateYearMarker(+d3.select("#yearSlider").property("value"));
}

function updateYearMarker(year) {
  if (!lineX) return;
  lineSvg
    .selectAll(".year-marker")
    .data([year])
    .join("line")
    .attr("class", "year-marker")
    .attr("x1", (d) => lineX(new Date(d, 0, 1)))
    .attr("x2", (d) => lineX(new Date(d, 0, 1)))
    .attr("y1", 0)
    .attr("y2", linePlotHeight)
    .attr("stroke", "#e44")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4,4");
}