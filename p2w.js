const fs = require('fs');
const path = require('path');

const ObjectsToCsv = require('objects-to-csv');
const csvToObject = require('csvtojson');

if (process.argv.length < 3) {
    console.log("number of people parameter is required.");
    process.exit(-1);
}

if (process.argv.length < 4) {
    console.log("method(merge|separate) parameter is required.");
    process.exit(-1);
}

if (process.argv.length < 5) {
    console.log("paragraph parameter is required.");
    process.exit(-1);
}

const numberOfPeople = process.argv[2];
const method = process.argv[3];
const paragraph = process.argv[4];


let lines = paragraph.split('\n');
let aLine = lines.reduce((current, next) => current.concat(` ${next}`), '');
let words = aLine.split(' ').filter(w => w.length);

let sheets = {};

if (method === 'separate') {

    for (let i = 1; i <= numberOfPeople; i++) {
        sheets[i] = [];
    }

    let counter = 1;
    words.forEach(word => {
        if (counter > numberOfPeople) {
            counter = 1;
        }
        sheets[counter].push({ word });
        counter++;
    })
}

if (method === 'merge') {
    let aSheet = [];
    let counter = 1;
    let row = {}
    words.forEach(word => {
        if (counter > numberOfPeople) {
            counter = 1;
            aSheet.push(row);
            row = {};
        }
        row[counter] = word;
        counter++;
    });
    aSheet.push(row);
    sheets[1] = aSheet;
}

const outputPath = '.' + path.sep + 'output' + path.sep + 'p2w' + path.sep + numberOfPeople;

function ensureDirSync (dirpath) {
    try {
        fs.mkdirSync(dirpath, { recursive: true })
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }
}

try {
    ensureDirSync(outputPath)
    console.log('Directory created')
} catch (err) {
    console.error(err)
}

Object.keys(sheets).forEach(index => {
    (async () => {
        let words = sheets[index];
        let csv = new ObjectsToCsv(words);
        // Save to file:
        await csv.toDisk(outputPath + path.sep + index + '.csv');
    })();
})
