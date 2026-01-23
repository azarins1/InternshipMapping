// Arthur Zarins
const fs = require('node:fs')

// Import raw data
const raw_data = fs.readFileSync('./swe_jobs.csv', 'utf8');
const lines = raw_data.split('\n')
const headers = lines[0].split('@') // Company, Role, Location. Application / Age is not important

var location_mappings = {
    'NYC': 'New York, NY',
    'SF': 'San Francisco, CA',
    'LA': 'Los Angeles, CA'
}
var usa_only = true;

// Process location string
function process_location(loc) {
    loc = loc.trim()
    if (loc[0] == '"') loc = loc.slice(1);
    if (loc[loc.length - 1] == '"') loc = loc.slice(0, -1);

    if (Number.isInteger(Number.parseInt(loc[0])) || loc.length == 0) {
        return null; // This is bad data - ignore it
    }
    if (loc.toLowerCase().indexOf("remote") > -1)
        return null; // the job is remote - ignore it

    if (location_mappings[loc] != undefined)
        loc = location_mappings[loc] // change abbreviation to full name

    if (usa_only && (loc.toLowerCase().indexOf("canada") > -1) || loc.indexOf("London") > -1)
        return null; // the job is international

    return loc;
}

console.log(`Processing ${lines.length} internship roles`); // comment this out later...

// Process data
var locations = {};
for (let l = 1; l < lines.length; l++) {
    let traits = lines[l].split('@');

    let location;
    if (traits.length == 1) {
        location = process_location(traits[0]);
    } else {
        location = process_location(traits[2]);
        company = traits[0];
    }
    if (location == null) continue; // ignore bad data

    if (locations[location] == undefined) {
        locations[location] = {internships: 0, companies: new Set()}; // initialize the location
    }
    locations[location].internships += 1;
    locations[location].companies.add(company);
}

let loc_array = []
for (const [key, value] of Object.entries(locations)) {
    loc_array.push({ location: key, data: value });
}
// sort so locations with the most internships have lower indices
loc_array.sort((a, b) => { return b.data.internships - a.data.internships; });

for (let i = 0; i < 10; i++){
    console.log(loc_array[i])
}
