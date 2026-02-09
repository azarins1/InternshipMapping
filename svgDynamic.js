const container = document.getElementById("map-container");
const svgHeight = container.clientHeight - document.getElementById('top-bar').clientHeight;
const svgWidth = container.clientWidth;

import { states, fullStateNames } from './state_names.js';
console.log(states, fullStateNames)

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

d3.json('2010_us_census.json').then(unitedStates => {
    // Map projection, pathGenerator, and svg append (except mouse events) generated with ChatGPT

    const projection = d3.geoAlbersUsa() //geoAlbersUsa
        .fitSize([svgWidth, svgHeight], unitedStates);
    globalProjection = projection;

    const pathGenerator = d3.geoPath()
        .projection(projection);

    svg.append("g")
        .selectAll("path")
        .data(unitedStates.features)
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
            if (jobCount == undefined) {
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
        filterChart('jobs', projection)
    });
})

document.getElementById('jobs_btn').addEventListener('click', () => { filterChart('jobs', globalProjection) });
document.getElementById('swe_btn').addEventListener('click', () => { filterChart('swe', globalProjection) });
document.getElementById('hardware_btn').addEventListener('click', () => { filterChart('hardware', globalProjection) });
document.getElementById('quant_btn').addEventListener('click', () => { filterChart('quant', globalProjection) });
document.getElementById('datascience_ml_btn').addEventListener('click', () => { filterChart('datascience_ml', globalProjection) });
document.getElementById('hide_btn').addEventListener('click', () => { toggleCities() });

function toggleCities(){
    showCities = !showCities;
    filterChart(lastTrait, globalProjection);
    if (showCities)
        document.getElementById('hide_btn').innerHTML = 'Hide Cities';
    else
        document.getElementById('hide_btn').innerHTML = 'Show Cities';
}

function deleteAll(){
    let circles = document.getElementsByTagName('circle');
    console.log(`Removing ${circles.length} circles`);
    for (let i = circles.length - 1; i >= 0; i--){
        circles[i].remove();
    }
    console.log('done');
}

function capitalizeWord(word){
    if (word == 'swe') return 'SWE';
    if (word == 'datascience_ml') return 'Data Science & ML';
    let firstLetter = word[0];
    console.log(firstLetter);
    return firstLetter.toUpperCase() + word.slice(1);
}

function filterChart(trait, projection) {
    lastTrait = trait;

    // highlight the related button
    let btns = document.getElementsByClassName('filterBtn');
    for (let i = 0; i < btns.length; i++){
        btns[i].classList.remove('selected');
    }
    document.getElementById(`${trait}_btn`).classList.add('selected')


    // Update the chart's title
    let titleText = `Tech Internships in United States`;
    if (trait != 'jobs')
        titleText = `${capitalizeWord(trait)} Internships in United States`;
    document.getElementById('title').innerHTML = titleText;

    deleteAll(); // remove pre-existing circles from the plot
    
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

        let r = Math.pow(data[i].data[trait], 3 / 5) * (svgWidth / 1000);
        const fillColor = '#04ffd9ff';
        svg.append('circle')
            .attr('cx', XYcoords[0])
            .attr('cy', XYcoords[1])
            .attr('r', r)
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

        let stateName = data[i].location.split(',').at(-1).trim();
        if (states[stateName] != undefined)
            stateName = states[stateName];
        if (stateStats[stateName] == undefined)
            stateStats[stateName] = 0;
        stateStats[stateName] += data[i].data[trait];
    }

    let region_array = []
    for (const [key, value] of Object.entries(stateStats)) {
        region_array.push({ state: key, jobs: value });
    }
    // sort so locations with the most internships have lower indices
    region_array.sort((a, b) => { return b.jobs - a.jobs; });
    const maxJobs = region_array[0].jobs;

    // Color in the states
    let state_names = Object.values(states);
    for (let i = 0; i < state_names.length; i++) {
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
        deleteAll();
}