const container = document.getElementById("fullScreen");
const svgHeight = container.clientHeight - document.getElementById('top-bar').clientHeight;
const svgWidth = container.clientWidth;

import { states, fullStateNames } from './state_names.js';
console.log(states, fullStateNames)
console.log(Object.values(states));

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
var lastTrait = '';
var zoomInUSA = true;
var globalProjection = null;
var geoJSON_data = null;
var fileName = '2010_us_census.json';
d3.json('canada_and_usa.json').then(unitedStates => {
    geoJSON_data = unitedStates;
    createProjection(geoJSON_data);
});
function createProjection(data_geoJSON) {
    // Map projection, pathGenerator, and svg append (except mouse events) generated with OpenAI ChatGPT 5

    let projection;
    if (zoomInUSA) {
        projection = d3.geoAlbersUsa()
            .fitSize([svgWidth, svgHeight], data_geoJSON)
    } else {
        projection = d3.geoAlbers()
            .parallels([29.5, 45.5])       // US-style parallels
            .rotate([96, 0])               // center longitude
            .center([0, 50])               // shift north to include Canada
            .scale(1200)
            .translate([svgWidth / 2, svgHeight / 2]);
    }
    // const projection = d3.geoAlbersUsa()
    //     .fitSize([svgWidth, svgHeight], unitedStates);

    // const projection = d3.geoAlbers()
    //     .parallels([29.5, 45.5])       // US-style parallels
    //     .rotate([96, 0])               // center longitude
    //     .center([0, 50])               // shift north to include Canada
    //     .scale(1200)
    //     .translate([svgWidth / 2, svgHeight / 2]);

    globalProjection = projection;

    const pathGenerator = d3.geoPath()
        .projection(projection);

    removeAllStates(); // delete any previous polygon paths
    svg.append("g")
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
        .on('mouseleave', (event) => {
            tooltip.style("visibility", "hidden");
            document.getElementById(event.currentTarget.id).style.strokeWidth = '0.5';
        })

    // Draw and Parse the cities
    d3.json('internship_data.json').then(internship_data => {
        internshipData = internship_data;
        filterChart('jobs', projection) // filter cities by role
    });

    if (zoomInUSA){
        // hide some Canadian provinces and Mexico
        // document.getElementById('Yukon').style.display = 'none';
        // document.getElementById('Northwest Territories').style.display = 'none';
        // document.getElementById('Nunavut').style.display = 'none';
        document.getElementById('Mexico').style.display = 'none';
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
    console.log(`Removing ${circles.length} circles`);
    for (let i = circles.length - 1; i >= 0; i--) {
        circles[i].remove();
    }
    console.log('done');
}

function removeAllStates() {
    let states = document.getElementsByClassName('state');
    console.log(`Removing ${states.length} state`);
    for (let i = states.length - 1; i >= 0; i--) {
        states[i].remove();
    }
    console.log('done');
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
    let titleText = `Tech Internships in North America`;
    if (trait != 'jobs')
        titleText = `${capitalizeWord(trait)} Internships in North America`;
    document.getElementById('title').innerHTML = titleText;

    removeAllCities(); // remove pre-existing circles from the plot

    stateStats = {}; // reset state stats
    const data = internshipData.cities;
    console.log(data[0].location, data[0].data.jobs, data[0].data[trait]);
    for (let i = 0; i < data.length; i++) {
        // draw city
        const coords = data[i].data.coords;
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
        svg.append('circle')
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
    for (let i = 0; i < 5; i++) {
        let entry = document.createElement('p');
        entry.innerHTML = `${i + 1}. ${region_array[i].state}, ${region_array[i].jobs} (${Math.floor(region_array[i].jobs * 100 / total_jobs)}%)<br>`
        quickStats.appendChild(entry);
        top_regions += region_array[i].jobs;
    }

    // Color in the states
    let state_names = Object.values(states);
    for (let i = 0; i < state_names.length; i++) {
        // console.log(state_names[i]);
        document.getElementById(state_names[i]).style.fill = 'rgb(0,80,80)';
    }
    console.log(region_array)
    for (let i = 0; i < region_array.length; i++) {
        const stateName = region_array[i].state;
        const jobs = region_array[i].jobs;
        const factor = 1 / 4;
        let scale = Math.pow(jobs, factor) * 255 / Math.pow(maxJobs, factor);
        if (document.getElementById(stateName) == undefined)
            continue;
        document.getElementById(stateName).style.fill =
            `rgb(${scale}, 80, 80)`;
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
    zoomInUSA = !zoomInUSA;
    createProjection(geoJSON_data);
    if (zoomInUSA) {
        projectionBtn.innerHTML = 'View North America'
    } else {
        projectionBtn.innerHTML = 'View United States'
    }
})