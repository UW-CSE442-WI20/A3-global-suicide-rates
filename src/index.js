var overall_data = require('../resources/overall-suicide-rates.json')
const detailed_data = require('../resources/detailed-suicide-rates.json')
const {
    outer_width, outer_height, padding, inner_width, inner_height,
    popup_width, circle_radius, x_col, y_col, pie_width, pie_height,
    pie_margin, pie_radius, selected_opacity, faded_opacity
} = require('./config.js');



// this is to highlight a single dot when you click on it
var if_dot_clicked = false;
var curr_dot = null;
var curr_dot_data = null;

// to maintain highlighting when legend is clicked
var legendIsClicked = false;

// allows this listener to be blocked by listeners on top of it
d3.select("body").on("click", function () { toggle_dot_highlight() });

// calculate the x and y scale based on max values of the data
var x_scale = d3.scaleLinear().domain([0, d3.max(overall_data, function (d) { return d["gdp_per_capita ($)"]; })]).range([padding.left, inner_width]);
var y_scale = d3.scaleLinear().domain([0, d3.max(overall_data, function (d) { return d["suicides/100k pop"]; })]).range([inner_height, padding.bottom]);

// prepare/aggregate the data //

// group by year
var group_by_year = d3.nest()
    .key(function (d) { return d.year })
    .entries(overall_data);
var group_by_year_overall_data = d3.nest()
    .key(function (d) { return d.year })
    .entries(detailed_data);

// it's magic, don't ask...
let regionList = ["Asia", "Northern Europe", "Western Europe", "Eastern Europe",
    "Mediterranean", "North America", "Central America and Caribbean", "South America"];

let colorList = ["#f28e2b", "#76b7b2", "#59a14f", "#e15759",
    "#edc948", "#4e79a7", "#bab0ac", "#b07aa1"];

let color = d3.scaleOrdinal()
    .domain(regionList)
    .range(colorList);

console.log("start");

// set up the actual visualization

// grab the scatter div to put an svg in
var svg = d3.select("#scatter")
    .append("svg")
    .attr("width", outer_width)
    .attr("height", outer_height);

// make some axis
var x_axis = d3.axisBottom()
    .scale(x_scale);
var y_axis = d3.axisLeft()
    .scale(y_scale);

// put the axis in the div
svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (outer_height - padding.top - padding.top) + ")")
    .call(x_axis);
svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding.left + ",0)")
    .call(y_axis);

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (outer_height / 2))
    .attr("y", padding.left / 4)
    .style("text-anchor", "middle")
    .text(y_col);
svg.append("text")
    .attr("x", outer_width / 2)
    .attr("y", outer_height - (padding.top / 2))
    .style("text-anchor", "middle")
    .text(x_col);


var pie_svg = d3.select("#popup")
    .append("svg")
    .attr("width", pie_width)
    .attr("height", pie_height)
    .append("g")
    .attr("transform", "translate(" + pie_width / 2 + "," + pie_height / 2 + ")");

setup_dots(svg, pie_svg, 1995);

legendListeners();

// Time
// d3.select('p#value-time') for the year
var dataTime = d3.range(0, 19).map(function (d) { return new Date(1995 + d, 10, 3); });

var sliderTime = d3.sliderBottom().min(d3.min(dataTime)).max(d3.max(dataTime))
    .step(1000 * 60 * 60 * 24 * 365).width(inner_width - padding.left).tickFormat(d3.timeFormat("%Y"))
    .tickValues(dataTime).default(new Date(1995, 10, 3))
    .on("onchange", val => { d3.select("p#value-time").text(d3.timeFormat("%Y")(val)); });


var gTime = d3.select("div#slider-time").append("svg").attr("width", inner_width).attr("height", 47)
    .append("g").attr("transform", "translate(" + padding.left / 4 + ",7)");

gTime.call(sliderTime);
d3.select("p#value-time").text(d3.timeFormat("%Y")(sliderTime.value()));


var year = -1;
// get instant input
setInterval(function () {
    var newYear = parseInt((d3.timeFormat("%Y")(sliderTime.value())));
    if (year != newYear) {
        year = newYear;
        plot_by_year(svg, pie_svg, year);
        // console.log(year);
    }
}, 50);

// Supposed to take in a year and plot the graph
function plot_by_year(svg, pie_svg, year) {
    // how do I grab data for a year without for looping??
    // var curr_year_data = group_by_year.key[year].values;
    var curr_year_data = {};
    for (var curr_year of group_by_year) {
        if (curr_year.key == year) {
            curr_year_data = curr_year.values;
        }
    }
    console.log(curr_year_data);
    curr_year_data = curr_year_data.slice(0);
    curr_year_data.sort(function (a, b) {

        var x = a.country.toLowerCase();
        var y = b.country.toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
    });

    svg.selectAll("circle")
        .data(curr_year_data)
        .transition()
        .duration(400)
        .attr("class", function (d) {
            return d["Region"].replace(/ /g, "_");
        })
        .style("fill", function (d) {
            return color(d["Region"]);
        })
        .attr("cx", function (d) {
            return x_scale(d["gdp_per_capita ($)"]);
        })
        .attr("cy", function (d) {
            return y_scale(d["suicides/100k pop"]);
        });
    d3.select("#year_text")
        .text(year);

    if (curr_dot) {
        for (var curr_country of curr_year_data) {
            if (curr_country.country == curr_dot_data["country"]) {
                curr_dot_data = curr_country;
                break;
            }
        }

        updateDetailedInfo(curr_dot_data, pie_svg);
    }
}

function highlight_dot(d, dot) {
    console.log("highlight")
    console.log(d)
    if_dot_clicked = true;
    curr_dot = dot;
    curr_dot_data = d;

    highlightRegion(d["Region"]);
    svg.selectAll("circle").style("opacity", faded_opacity);
        d3.select(curr_dot).style("opacity", selected_opacity);

    pie_svg.style("visibility", "visible");
    updateDetailedInfo(d, pie_svg);
}

function fade_dots(d, svg, tooltip, i, pie_svg) {
    // Always display tooltip
    tooltip.text(d["country"]);
    tooltip.style("visibility", "visible");

    if (curr_dot == null) {
        // Country display info should only update if there is no selection
        document.getElementById("popup").style.visibility = "visible";
        updateDetailedInfo(d, pie_svg);

        if (!legendIsClicked) {
            highlightRegion(d["Region"]);
        }
    }
}

function unfade_dots(svg, tooltip, pie_svg) {
    if (!curr_dot) {
        pie_svg.selectAll("*").remove();
        document.getElementById("popup").style.visibility = "hidden";
        if (!legendIsClicked) {
            svg.selectAll("circle").style("opacity", selected_opacity);
            setLegendHighlight("");
        }
    } else {
        svg.selectAll("circle").style("opacity", faded_opacity);
        d3.select(curr_dot).style("opacity", selected_opacity);
    }

    return tooltip.style("visibility", "hidden");
}

function updateDetailedInfo(d, pie_svg) {
    document.getElementById("country-text").innerHTML = "Country: " + d["country"];
    document.getElementById("gdp-text").innerHTML = "GDP per Capita: $" + d["gdp_per_capita ($)"];
    document.getElementById("suicide-text").innerHTML = "Suicide Rate per 100k People: " + d["suicides/100k pop"];

    show_pie_chart(d, pie_svg);
}

function show_pie_chart(d, pie_svg) {
    pie_svg.style("visibility", "visible");
    var male = 0;
    var female = 0;
    for (var curr_year of group_by_year_overall_data) {
        if (curr_year.key == d["year"]) {
            var curr_values = curr_year.values;
            for (var country of curr_values) {
                if (country.country == d["country"]) {
                    if (country["sex"] == "male") {
                        male = country["suicides/100k pop"] + male;
                    } else {
                        female = country["suicides/100k pop"] + female;
                    }
                }
            }
            break;
        }
    }

    document.getElementById("country-text").innerHTML = "Country: " + d["country"];
    document.getElementById("gdp-text").innerHTML = "GDP per Capita: " + d["gdp_per_capita ($)"];
    document.getElementById("suicide-text").innerHTML = "Suicide Rate Rate per 100k People: " + d["suicides/100k pop"];

    var sex_data = { "male": male, "female": female };
    var pie_color = d3.scaleOrdinal()
        .domain(sex_data)
        .range(["#76b7b2", "#e15759"]);
    var pie = d3.pie()
        .value(function (d) { return d.value; });
    var data_ready = pie(d3.entries(sex_data));

    var u = pie_svg.selectAll("path")
        .data(data_ready)

    u
        .enter()
        .append('path')
        .merge(u)
        .transition()
        .duration(1000)
        .attr('d', d3.arc()
            .innerRadius(0)
            .outerRadius(pie_radius)
        )
        .attr('fill', function (d) { return (pie_color(d.data.key)) })
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 1)

    var arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(pie_radius);

    u
        .enter()
        .append('text')
        .transition()
        .duration(1000)
        .text(function (d) { return d.data.key })
        .attr("transform", function (d) { return "translate(" + arcGenerator.centroid(d) + ")"; })
        .style("text-anchor", "middle")
        .style("font-size", 13);
}

function toggle_dot_highlight() {
    console.log("toggle");
    svg.selectAll("circle").style("opacity", selected_opacity);
    document.getElementById("popup").style.visibility = "hidden";
    pie_svg.style("visibility", "hidden");
    curr_dot = null;

    if_dot_clicked = false;
    legendIsClicked = false;
    setLegendHighlight("");
}

function legendListeners() {
    d3.select("#legend").selectAll("td")
        .on("mouseover", function() {
            if (!legendIsClicked) {
                highlightRegion(this.className);
            }
        })
        .on("mouseout", function() {
            if (!legendIsClicked) {
                setLegendHighlight("");
                if (curr_dot) {
                    d3.selectAll("circle").style("opacity", faded_opacity);
                    d3.select(curr_dot).style("opacity", selected_opacity);
                } else {
                    d3.selectAll("circle").style("opacity", selected_opacity);
                }
            }
        })
        .on("click", function() {
            legendIsClicked = true;
            document.getElementById("popup").style.visibility = "hidden";
            pie_svg.style("visibility", "hidden");
            highlightRegion(this.className);
        });
}

function highlightRegion(region) {
    console.log("highlighting " + region);

    d3.event.stopPropagation();

    setLegendHighlight(region);

    d3.selectAll("svg").selectAll("circle")
        .style("opacity", faded_opacity);
    d3.selectAll("circle." + region.replace(/ /g, "_"))
        .style("opacity", selected_opacity);
}

function setLegendHighlight(region) {
    var td = d3.selectAll("#legend td");
    if (!region) {
        td.style("opacity", 0);
    } else {
        td.style("opacity", 0.7);
        d3.select("#legend ." + region.replace(/ /g, "_"))
            .style("opacity", 0);
    }
}

function setup_dots(svg, pie_svg, year) {
    var curr_year_data = {};
    for (var curr_year of group_by_year) {
        if (curr_year.key == year) {
            curr_year_data = curr_year.values;
        }
    }

    curr_year_data = curr_year_data.slice(0);
    curr_year_data.sort(function (a, b) {

        var x = a.country.toLowerCase();
        var y = b.country.toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
    });

    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("background", "rgba(255,255,255,0)")
        .text("a simple tooltip");
    svg.selectAll("circle")
        .data(curr_year_data)
        .enter()
        .append("circle")
        .attr("class", function (d) {
            return d["Region"].replace(/ /g, "_");
        })
        .attr("cx", function (d) {
            return x_scale(d["gdp_per_capita ($)"]);
        })
        .attr("cy", function (d) {
            return y_scale(d["suicides/100k pop"]);
        })
        .attr("r", function (d) {
            return circle_radius;
        })
        .style("stroke", "black")
        .style("opacity", 0.8)
        .style("fill", function (d) {
            return color(d["Region"]);
        })
        .on("mouseover", function (d, i) { return fade_dots(d, svg, tooltip, this, pie_svg); })
        .on("mousemove", function () { return tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px"); })
        .on("mouseout", function () { return unfade_dots(svg, tooltip, pie_svg) })
        .on("click", function (d, i) { highlight_dot(d, this) });

    svg.append("text")
        .attr("id", "year_text")
        .attr("x", outer_width / 2 + padding.left)
        .attr("y", padding.top + padding.left)
        .attr("dy", ".35em")
        .style("opacity", 0.2)
        .style("font-size", "80px")
        .text(year);
}