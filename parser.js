// Arthur Zarins
const fs = require('node:fs')

// Import raw data
const raw_data = fs.readFileSync('./quant_jobs.csv', 'utf8');
const lines = raw_data.split('\n')
const headers = lines[0].split('@') // Company, Role, Location. Application / Age is not important

var location_mappings = {
    'NYC': 'New York, NY',
    'SF': 'San Francisco, CA',
    'LA': 'Los Angeles, CA'
}
var usa_only = true;


console.log(`Processing ${lines.length} internship roles`); // comment this out later...

// Process data
var global_job_count = 0;
var locations = {};

let last_company = '';
for (let l = 1; l < lines.length; l++) {
    let traits = lines[l].split('@');

    let location;
    if (traits.length == 1) {
        location = process_location(traits[0]);
        company = last_company;
    } else {
        location = process_location(traits[2]);
        company = process_company(traits[0]); // get company name
        // use previous company if down arrow is used
        if (company.trim() == '↳') company = last_company;
    }
    if (location == null) continue; // ignore bad data

    if (locations[location] == undefined) {
        locations[location] = {jobs: 0, companies: new Set()}; // initialize the location
    }
    locations[location].jobs += 1;
    locations[location].companies.add(company);
    global_job_count += 1;
    last_company = company; // update the last recorded company
}

let loc_array = []
for (const [key, value] of Object.entries(locations)) {
    loc_array.push({ location: key, data: value });
}
// sort so locations with the most internships have lower indices
loc_array.sort((a, b) => { return b.data.jobs - a.data.jobs; });

for (let i = 0; i < 15; i++){
    console.log(`${i+1}.\t${loc_array[i].location} - ${loc_array[i].data.jobs} (${to_percent(loc_array[i].data.jobs, global_job_count)})`)
    // console.log(loc_array[i].data.companies)
}

console.log(global_job_count)



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

function process_company(com){
    com = com.replace('🔥',''); // remove emoji
    return com.trim();
}

function to_percent(num, denom){
    percent = Math.floor(num * 1000 / denom) / 10;
    return `${percent}%`;
}