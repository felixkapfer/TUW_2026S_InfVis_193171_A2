let mapWidth = 800;
let mapHeight = 500;
let map = null;
let mapData = null;

let CODES = null;
let DATA_PCA = null;
let DATA_YEARS = null;
let DATA_COUNTRIES = null;

async function initScatterPlot(data, pca, years) {
    CODES = Object.entries(data).map(d => d[0]);
    DATA_PCA = pca;
    DATA_YEARS = years;
    DATA_COUNTRIES = data;

    countries = await d3.json("../static/data/world-topo.json");

    // defines the map projection method and scales the map within the SVG
        let projection = d3.geoEqualEarth()
            .scale(180)
            .translate([mapWidth / 2, mapHeight / 2]);

        // generates the path coordinates from topojson
        let path = d3.geoPath()
            .projection(projection);

        // configures the SVG element
        let svg = d3.select("#svg_map")
            .attr("width", mapWidth)
            .attr("height", mapHeight);

        // map geometry
        mapData = topojson.feature(countries, countries.objects.countries).features;

        // generates and styles the SVG path
        map = svg.append("g")
            .selectAll('path')
            .data(mapData)
            .enter().append('path')
            .attr('d', path)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .attr('fill', d => {
                // Check if current country is in our list
                return CODES.includes(d.properties.id) ? "lightgrey" : "white";
            })
            .on("mouseover", (event, d) => updateMap(d));;
       

    var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

    var svg2 = d3.select("#svg_plot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
        .domain(d3.extent(DATA_PCA, d => d.PC1))
        .range([0, width]);

    svg2.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLinear()
        .domain(d3.extent(DATA_PCA, d => d.PC2))
        .range([height, 0]);

    svg2.append("g")
        .call(d3.axisLeft(y));

    // Add dots
    var myCircle = svg2.append('g')
        .selectAll("circle")
        .data(DATA_PCA)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return x(d.PC1); } )
        .attr("cy", function (d) { return y(d.PC2); } )
        .attr("r", 5)
        .attr("fill", "#21908dff")
        .style("opacity", 0.7)
        .on("mouseover", (event, d) => updateChart(d));

    // Function that is triggered when brushing is performed
    function updateChart(event) {
        myCircle.classed("selected", function(d){
            return event.PC1 == d.PC1 && event.PC2 == d.PC2;
        });

        // filter all points that are effected
        let brushedPoints = DATA_PCA.filter(d => event.PC1 == d.PC1 && event.PC2 == d.PC2);
       
        let targetedCountryCodes = [...new Set(brushedPoints.map(d => d.Code))] // get unique country codes

        // update map to select all points that are effected
        svg.selectAll('path')
            .attr('fill', d => {
                if (targetedCountryCodes.includes(d.properties.id)) return "red";

                return CODES.includes(d.properties.id) ? "lightgrey" : "white";
            });
    }

    function updateMap(event) {
        myCircle.classed("selected", function(d){
            return event.properties.id == d.Code;
        });


        targetedCountryCodes = [event.properties.id]
        // update map to select all points that are effected
        svg.selectAll('path')
            .attr('fill', d => {
                if (targetedCountryCodes.includes(d.properties.id) && CODES.includes(d.properties.id)) return "red";

                return CODES.includes(d.properties.id) ? "lightgrey" : "white";
            });
    }

    
const svg3 = d3.select("#svg_line_plot")
    .append("svg")
    .style("border", "2px solid red")
    .attr("width", 800)
    .attr("height", 500);

const rawSeries = DATA_COUNTRIES["AUT"]["Agricultural raw materials imports (% of merchandise imports)"];
const series = DATA_YEARS.map((year, i) => ({
    date: new Date(+year, 0, 1),
    value: +rawSeries[i]
})).filter(d => !isNaN(d.value));

console.log(series);

const x2 = d3.scaleTime()
    .domain(d3.extent(series, d => d.date))
    .range([0, width]);

svg3.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
        d3.axisBottom(x2)
          .ticks(d3.timeYear.every(5))
          .tickFormat(d3.timeFormat("%Y"))
    );

const y2 = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.value)])
    .nice()
    .range([height, 0]);

svg3.append("g")
    .call(d3.axisLeft(y2));

svg3.append("path")
    .datum(series)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 5)
    .attr("d", d3.line()
        .x(d => x2(d.date))
        .y(d => y2(d.value))
    );
    
}