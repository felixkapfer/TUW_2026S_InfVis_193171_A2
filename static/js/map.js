let mapWidth = 800;
let mapHeight = 500;
let map = null;
let mapData = null;

let CODES = null;
let DATA_PCA = null;
let DATA_YEARS = null;
let DATA_COUNTRIES = null;

let CLICKED = null;

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
            .on("mouseover", (event, d) => updateMap(d))
            .on("mouseout", (event, d) => updateMapOut(d))
            .on("click", (event, d) => onMouseClick(event, d));
       

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
        .on("mouseover", (event, d) => updateChart(d))
        .on("mouseout", (event, d) => updateMapOut(d));

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
        if (!CODES.includes(event.properties.id)) return;

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

    function updateMapOut(event) {
        if (CLICKED) return;

        myCircle.classed("selected", function(d){
            return false;
        });

        targetedCountryCodes = []
        // update map to select all points that are effected
        svg.selectAll('path')
            .attr('fill', d => {
                if (targetedCountryCodes.includes(d.properties.id) && CODES.includes(d.properties.id)) return "red";

                return CODES.includes(d.properties.id) ? "lightgrey" : "white";
            });

        d3.select("#svg_line_plot")
            .selectAll("svg")
            .data([null])
            .join("svg")
            .attr("opacity", "0.0")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        }

    function onMouseClick(event, d) {
        CLICKED = true;
    console.log(event, d);

   

    // Get data
    const rawSeries =
        DATA_COUNTRIES[d.properties.id][
            d3.select("#indicator_change").property("value")
        ];

    const series = DATA_YEARS.map((year, i) => ({
        date: new Date(+year, 0, 1),
        value: rawSeries[i]
    }));

    // Select existing svg or create once
    const svg = d3.select("#svg_line_plot")
        .selectAll("svg")
        .data([null])
        .join("svg")
        .attr("opacity", "1.0")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Main group
    const g = svg.selectAll("g.main")
        .data([null])
        .join("g")
        .attr("class", "main")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleTime()
        .domain(d3.extent(series, d => d.date))
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d.value)])
        .nice()
        .range([height, 0]);

    // Update X axis
    g.selectAll(".x-axis")
        .data([null])
        .join("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(x)
                .ticks(d3.timeYear.every(5))
                .tickFormat(d3.timeFormat("%Y"))
        );

    // Update Y axis
    g.selectAll(".y-axis")
        .data([null])
        .join("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    // Update line
    g.selectAll(".line")
        .data([series])
        .join("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
    }

    d3.select("#indicator_change")
        .on("change", function () {
            const selectedValue = d3.select(this).property("value");

   
    redCountries = [];
    
    d3.select("#svg_map").selectAll("path")
    .filter(function () {
        return d3.select(this).attr("fill") === "red";
    })
    .each(function (d) {
        redCountries.push(d.properties.id);
    });

    // console.log("Red countries:", redCountries);    

    // Get data
    const rawSeries =
        DATA_COUNTRIES[redCountries[0]][
            d3.select("#indicator_change").property("value")
        ];

    const series = DATA_YEARS.map((year, i) => ({
        date: new Date(+year, 0, 1),
        value: rawSeries[i]
    }));

    // Select existing svg or create once
    const svg = d3.select("#svg_line_plot")
        .selectAll("svg")
        .data([null])
        .join("svg")
        .attr("opacity", "1.0")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Main group
    const g = svg.selectAll("g.main")
        .data([null])
        .join("g")
        .attr("class", "main")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleTime()
        .domain(d3.extent(series, d => d.date))
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d.value)])
        .nice()
        .range([height, 0]);

    // Update X axis
    g.selectAll(".x-axis")
        .data([null])
        .join("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(x)
                .ticks(d3.timeYear.every(5))
                .tickFormat(d3.timeFormat("%Y"))
        );

    // Update Y axis
    g.selectAll(".y-axis")
        .data([null])
        .join("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    // Update line
    g.selectAll(".line")
        .data([series])
        .join("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });

}