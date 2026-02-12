const container = document.getElementById("fullScreen");
const svgHeight = container.clientHeight - document.getElementById('top-bar').clientHeight;
const svgWidth = container.clientWidth;

import { states, fullStateNames } from './state_names.js';

const svg = d3.select("#map-container")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

// Create a tooltip
var tooltip = d3.select("#map-container")
    .append("div")
    .style("position", "absolute")
    .attr('class', 'tooltip')
    .style("visibility", "hidden")

var internshipData = {};
var stateStats = {};
var globalProjection = undefined;
var showCities = true;
var lastTrait = 'jobs';
var showOnlyUSA = false;
var globalProjection = null;
var geoJSON_data = null;
var pathGenerator = null;
var zoomedInState = null;

d3.json('canada_and_usa.json').then(unitedStates => {
    geoJSON_data = unitedStates;
    createProjection(geoJSON_data);
});
function createProjection(data_geoJSON) {
    // Map projection, pathGenerator, and svg append (except mouse events) generated with OpenAI ChatGPT 5
    if (showOnlyUSA) {
        globalProjection = d3.geoAlbersUsa()
            .fitSize([svgWidth, svgHeight], data_geoJSON)
    } else {
        globalProjection = d3.geoAlbers()
            .parallels([29.5, 45.5])
            .rotate([96, 0])
            .center([0, 50])
            .scale(Math.min(1200, svgWidth))
            .translate([svgWidth / 2, svgHeight / 2]);
    }

    pathGenerator = d3.geoPath()
        .projection(globalProjection);

    removeAllStates(); // delete any previous polygon paths
    if (document.getElementById('SVG_G') != undefined)
        document.getElementById('SVG_G').remove();

    svg.append("g")
        .attr('id', 'SVG_G')
        .selectAll("path")
        .data(data_geoJSON.features)
        .enter()
        .append("path")
        .attr('id', d => d.properties.NAME)
        .attr("class", "state")
        .attr("d", pathGenerator)
        .on("mouseover", (event) => {
            document.getElementById(event.currentTarget.id).style.strokeWidth = '5';
        })
        .on("mouseenter", (event) => {
            tooltip.style("visibility", "visible");
            const stateName = event.currentTarget.id;
            const jobCount = stateStats[stateName];
            if (stateName == 'Mexico')
                tooltip.html(`${stateName}`);
            else if (jobCount == undefined) {
                tooltip.html(`${stateName}<br><i>No roles</i>`);
            } else if (jobCount == 1) {
                tooltip.html(`${stateName}<br><i>1 role</i>`);
            } else {
                tooltip.html(`${stateName}<br><i>${jobCount} roles</i>`);
            }
        })
        .on("mousemove", (evt) => {
            tooltip.style("top", (event.offsetY) + "px").style("left", (event.offsetX + 10) + "px");
        })
        .on('click', (evt) => {
        })
        .on('mouseleave', (event) => {
            tooltip.style("visibility", "hidden");
            document.getElementById(event.currentTarget.id).style.strokeWidth = '0.5';
        })

    // Zoom setup - generated with ChatGPT 5
    d3.select('#SVG_G').selectAll("path")
        .on("click", (event, d) => {
            let selectedState = d.properties.NAME;
            if (zoomedInState == selectedState) {
                resetZoom(); // we are already zoomed in - zoom out
            } else {
                zoomedInState = d.properties.NAME;
                zoomToFeature(d);
            }
        });

    // Draw and Parse the cities
    d3.json('internship_data.json').then(internship_data => {
        internshipData = internship_data;
        filterChart(lastTrait, globalProjection) // filter cities by role
    });

    if (showOnlyUSA) {
        // hide Canadian provinces and Mexico
        const to_hide = ['Mexico',
            'Yukon', 'Northwest Territories', 'Nunavut', 'British Columbia',
            'Alberta', 'Ontario', 'Quebec', 'New Brunswick', 'Manitoba',
            'Saskatchewan', 'Prince Edward Island', 'Nova Scotia'
        ]
        for (let i = 0; i < to_hide.length; i++) {
            document.getElementById(to_hide[i]).style.display = 'none';
        }
    }
}

document.getElementById('jobs_btn').addEventListener('click', () => { filterChart('jobs', globalProjection) });
document.getElementById('swe_btn').addEventListener('click', () => { filterChart('swe', globalProjection) });
document.getElementById('hardware_btn').addEventListener('click', () => { filterChart('hardware', globalProjection) });
document.getElementById('quant_btn').addEventListener('click', () => { filterChart('quant', globalProjection) });
document.getElementById('datascience_ml_btn').addEventListener('click', () => { filterChart('datascience_ml', globalProjection) });
document.getElementById('hide_btn').addEventListener('click', () => { toggleCities() });

function toggleCities() {
    showCities = !showCities;
    filterChart(lastTrait, globalProjection);
    if (showCities)
        document.getElementById('hide_btn').innerHTML = 'Hide Cities';
    else
        document.getElementById('hide_btn').innerHTML = 'Show Cities';
}

// Delete all circles in the SVG
function removeAllCities() {
    let circles = document.getElementsByTagName('circle');
    for (let i = circles.length - 1; i >= 0; i--) {
        circles[i].remove();
    }
    console.log('citiesRemoved')
}

function removeAllStates() {
    let states = document.getElementsByClassName('state');
    for (let i = states.length - 1; i >= 0; i--) {
        states[i].remove();
    }
}

function capitalizeWord(word) {
    if (word == 'swe') return 'SWE';
    if (word == 'datascience_ml') return 'Data Sci & ML';
    let firstLetter = word[0];
    console.log(firstLetter);
    return firstLetter.toUpperCase() + word.slice(1);
}

// Display a complete chart, filtered for a specific type of job
function filterChart(trait, projection) {
    lastTrait = trait;

    // highlight the related button
    let btns = document.getElementsByClassName('filterBtn');
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('selected');
    }
    document.getElementById(`${trait}_btn`).classList.add('selected')

    // Update the chart's title
    let region = 'North America'
    if (showOnlyUSA) region = 'United States'
    let titleText = `Tech Internships in ${region}`;
    if (trait != 'jobs')
        titleText = `${capitalizeWord(trait)} Internships in ${region}`;
    document.getElementById('title').innerHTML = titleText;

    removeAllCities(); // remove pre-existing circles from the plot

    stateStats = {}; // reset state stats
    const data = internshipData.cities;
    for (let i = 0; i < data.length; i++) {
        // draw city
        const coords = data[i].data.coords;

        if (data[i].location.indexOf('Canada') != -1 && showOnlyUSA) {
            continue; // ignore Canadian cities when zoomed into USA
        }
        if (coords == undefined) {
            // Assign jobs to state total if coordinates are undefined
            let location = data[i].location;
            if (fullStateNames.has(location)) {
                if (stateStats[location] == undefined)
                    stateStats[location] = 0;
                stateStats[location] += data[i].data[trait];
            }
            continue;
        }
        const XYcoords = projection([coords[1], coords[0]]);
        if (!XYcoords)
            continue;

        let r = Math.sqrt(data[i].data[trait]) * (svgWidth / 750);
        const fillColor = '#04ffd9ff';
        const g = d3.select('#SVG_G');
        g.append('circle')
            .attr('cx', XYcoords[0])
            .attr('cy', XYcoords[1])
            .attr('r', 0)
            .attr('fill', fillColor)
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.3)
            .attr('TOTAL_JOBS', data[i].data[trait])
            .attr('DATA', data[i].data)
            .attr('CITY_NAME', data[i].location)
            .attr('opacity', 0.5)
            .on("mouseenter", (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 1)
                    .attr('stroke-width', 3)
                    .attr('z-index', 99)
                    .attr('fill', 'lime')
                tooltip.style("visibility", "visible");
                const cityName = d3.select(event.currentTarget).attr('CITY_NAME');
                const jobCount = d3.select(event.currentTarget).attr('TOTAL_JOBS');
                if (jobCount == 1) {
                    tooltip.html(`${cityName}<br><i>1 role</i>`);
                } else {
                    tooltip.html(`${cityName}<br><i>${jobCount} roles</i>`);
                }
            })
            .on("mousemove", (evt) => {
                tooltip.style("top", (event.offsetY) + "px").style("left", (event.offsetX + 10) + "px");
            })
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.7)
                    .attr('stroke-width', 1)
                    .attr('fill', fillColor)
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(500)
            .attr('r', r)


        if (data[i].location.split(',').length >= 2) {
            let stateName = data[i].location.split(',').at(1).trim();
            if (states[stateName] != undefined)
                stateName = states[stateName];
            if (stateStats[stateName] == undefined)
                stateStats[stateName] = 0;
            stateStats[stateName] += data[i].data[trait];
        }
    }

    let region_array = []
    let total_jobs = 0;
    for (const [key, value] of Object.entries(stateStats)) {
        region_array.push({ state: key, jobs: value });
        total_jobs += value;
    }
    // sort so locations with the most internships have lower indices
    region_array.sort((a, b) => { return b.jobs - a.jobs; });
    const maxJobs = region_array[0].jobs;

    const quickStats = document.getElementById('quickStats');
    let top_regions = 0;
    quickStats.innerHTML =
        `<p><b><u>${total_jobs} total roles</u></b></p>`;
    let quantity = 5;
    if (!showOnlyUSA && svgWidth > 1000) quantity = 10;
    for (let i = 0; i < quantity; i++) {
        let entry = document.createElement('p');
        entry.innerHTML = `${i + 1}. ${region_array[i].state}, ${region_array[i].jobs} (${Math.floor(region_array[i].jobs * 100 / total_jobs)}%)<br>`
        quickStats.appendChild(entry);
        top_regions += region_array[i].jobs;
    }

    // Color in the states
    const baseNum = 80;
    let state_names = Object.values(states);
    for (let i = 0; i < state_names.length; i++) {
        // console.log(state_names[i]);
        document.getElementById(state_names[i]).style.fill = `rgb(0,${baseNum},${baseNum})`;
    }
    for (let i = 0; i < region_array.length; i++) {
        const stateName = region_array[i].state;
        const jobs = region_array[i].jobs;
        const factor = 1 / 4;
        let scale = Math.pow(jobs, factor) * 255 / Math.pow(maxJobs, factor);
        let scale2 = baseNum;//scale * 0.2 + baseNum;
        if (document.getElementById(stateName) == undefined)
            continue;
        document.getElementById(stateName).style.fill =
            `rgb(${scale}, ${scale2}, ${scale2})`;
    }

    if (showCities == false)
        removeAllCities();
}

function createLegend() {
    const legend = document.getElementById('legend');

    const label_most = document.createElement('p');
    label_most.innerHTML = 'Most roles';
    label_most.classList.add('labelMost');
    legend.appendChild(label_most);

    const rect = document.createElement('div');
    rect.id = 'legendBox';
    legend.appendChild(rect);

    const label_least = document.createElement('p');
    label_least.innerHTML = 'Least roles';
    legend.appendChild(label_least);
}
createLegend();

document.getElementById('projection_btn').addEventListener('click', () => {
    const projectionBtn = document.getElementById('projection_btn');
    showOnlyUSA = !showOnlyUSA;
    createProjection(geoJSON_data);
    if (showOnlyUSA) {
        projectionBtn.innerHTML = 'View North America';
    } else {
        projectionBtn.innerHTML = 'View United States'
    }
})

/**
 * zoom, zoomToFeature(), resetZoom() code generated with ChatGPT 5
 */
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        d3.select('#SVG_G').attr("transform", event.transform);
    });

svg.call(zoom);

function zoomToFeature(feature) {
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;

    const scale = Math.min(8, 0.9 / Math.max(dx / svgWidth, dy / svgHeight));

    const transform = d3.zoomIdentity
        .translate(svgWidth / 2, svgHeight / 2)
        .scale(scale)
        .translate(-x, -y);

    svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}
function resetZoom() {
    zoomedInState = null;
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}