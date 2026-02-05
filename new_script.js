const r = await fetch('/internship_data.json');
const data = (await r.json()).cities;

const usaMap = document.getElementById('USA_map');
// console.log(usaMap.width, usaMap.height);

let lat = [9999, -9999];
let long = [9999, -9999];
for (let i = 0; i < data.length; i++) {
    const cityCoords = data[i].data.coords;
    if (cityCoords == undefined) continue;
    lat = [Math.min(lat[0], cityCoords[0]), Math.max(lat[1], cityCoords[0])];
    long = [Math.min(long[0], cityCoords[1]), Math.max(long[1], cityCoords[1])];
}

console.log(data);
console.log('lat range', lat);
console.log('long range', long);

console.log(data[0].data.coords)

const svg = d3.select('#svg');

function mercator(coords) {
    if (coords == undefined)
        return [-900, -900];

    // coords = [coords[1], coords[0]]; // flip the coordinates
    // coords are initially in degrees; convert to radians!
    const mapWidth = window.innerWidth;
    const mapHeight = window.innerHeight;

    const coords_rad = [coords[0] * Math.PI / 180, coords[1] * Math.PI / 180];

    const normalizedX = coords_rad[1] / Math.PI;
    const normalizedY = Math.log(Math.tan(Math.PI / 4 + coords_rad[0] / 2))

    const x = (normalizedX + 1) * mapWidth / 2; // Adjust for -1 to 1 range
    const y = (mapHeight / 2) - (normalizedY * mapHeight / 2); // Flip y-axis and scale

    // return [x,y];
    let mercatorCoords = [x, y];

    // last step: zoom into the canvas
    const x_bounds = [0.1515, 0.3152];
    const y_bounds = [0, 0.3];
    const y_margin = 0.05;

    let new_coords = [0, 0];
    new_coords[0] = (mercatorCoords[0] - x_bounds[0] * window.innerWidth) / (x_bounds[1] - x_bounds[0]);
    new_coords[1] = (mercatorCoords[1] - y_bounds[0] * window.innerHeight) / (y_bounds[1] - y_bounds[0]);

    new_coords[1] += -5;
    // new_coords[1] = new_coords[1] * (1 - 2) + y_margin;
    // console.log(new_coords[1])

    return new_coords;
}

// Create a tooltip
var tooltip = d3.select("#svgWrapper")
    .append("div")
    .style("position", "absolute")
    .attr('class', 'tooltip')
    .style("visibility", "hidden")
    .text("HELLO");

svg.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => mercator(d.data.coords)[0])
    .attr('cy', d => mercator(d.data.coords)[1])
    .attr('r', d => Math.pow(d.data.jobs, 3 / 5))
    .attr('CITY_NAME', d => d.location)
    .attr('TOTAL_JOBS', d => d.data.jobs)
    .attr('fill', d => 'lime')
    .attr('opacity', 0.5)
    .attr('stroke', 'black')
    .on("mouseenter", (event) => {
        d3.select(event.currentTarget)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
            .attr('z-index', 9);
        tooltip.style("visibility", "visible");
        const cityName = d3.select(event.currentTarget).attr('CITY_NAME');
        const jobCount = d3.select(event.currentTarget).attr('TOTAL_JOBS');
        if (jobCount == 1) {
            tooltip.html(`${cityName} (1 job)`);
        } else {
            tooltip.html(`${cityName} (${jobCount} jobs)`);
        }
    })
    .on("mousemove", (evt) => {
        tooltip.style("top", (event.offsetY) + "px").style("left", (event.offsetX + 10) + "px");
    })
    .on('mouseleave', (event) => {
        d3.select(event.currentTarget)
            .attr('opacity', 0.7)
            .attr('stroke-width', 1);
        tooltip.style("visibility", "hidden");
    })


// Top-right
// 49.763279, -67.569368

// Bottom-right
// 24.118709, -66.858654

// Bottom-left
// 22.453820, -125.695452

// Top-left
// 49.763279, -126.136361