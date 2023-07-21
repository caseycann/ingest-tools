const fs = require('fs');
const csv = require('csv-parser');
const xmlbuilder = require('xmlbuilder');

// Define the path of your CSV
const csvPath = 'data.csv';

const items = [];
fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    items.push(row);
  })
  .on('end', () => {
    const xml = xmlbuilder.create('fcpxml', { version: '1.0', encoding: 'UTF-8' })
    .ele('version', '1.10')
    .ele('resources')
      .ele('asset', {
        id: "r1",
        name: items[0].name,   // Assuming you have 'name' column in your CSV
        uid: "D9DC120539971782A7B9ED0E4E955408",
        start: items[0].start, // Assuming you have 'start' column in your CSV
        duration: items[0].duration, // Assuming you have 'duration' column in your CSV
        hasVideo: "1",
        format: "r2",
        hasAudio: "1",
        videoSources: "1",
        audioSources: "1",
        audioChannels: "2",
        audioRate: "48000"
      })
      // ... more XML content here ...
      .end({ pretty: true});

    fs.writeFile('output.xml', xml, (err) => {
      if (err) {
        console.error('Something went wrong:', err);
      }
      console.log('File has been created');
    });
  });
