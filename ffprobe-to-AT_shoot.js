import dotenv from 'dotenv';
dotenv.config();
import { spawnSync } from 'child_process';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import Airtable from 'airtable';


const base = new Airtable(process.env.AIRTABLE_API_KEY).base(process.env.AIRTABLE_BASE_ID);



// Retrieve the path from the command line arguments
const topLevelDirectory = process.argv[2];

// Keys to write to CSV
const keysToWrite = ['streams.0.codec_name', 'streams.0.profile', 'streams.0.codec_type', 'streams.0.width', 'streams.0.height', 'streams.0.pix_fmt', 'streams.0.color_space', 'streams.0.color_transfer', 'streams.0.color_primaries', 'streams.0.time_base', 'streams.0.duration_ts', 'streams.0.duration', 'streams.0.bit_rate', 'streams.0.bits_per_raw_sample', 'streams.0.tags.creation_time', 'streams.0.tags.timecode']; 

// Check if a path was provided
if (!topLevelDirectory) {
  console.error('Please provide the path to the shoot folder.');
  process.exit(1);
}

// Determine if the provided path is a directory
try {
  const stats = statSync(topLevelDirectory);
  if (!stats.isDirectory()) {
    console.error('Invalid path. Please provide a valid path to a directory.');
    process.exit(1);
  }
} catch (error) {
  console.error(`Error accessing path: ${error}`);
  process.exit(1);
}

// Process all video files in the top-level directory
function processTopLevelDirectory(directoryPath) {
    try {
      const subfolders = readdirSync(directoryPath);
      let data = [];
  
      for (const subfolder of subfolders) {
        const subfolderPath = join(directoryPath, subfolder);
        const stats = statSync(subfolderPath);
  
        if (stats.isDirectory()) {
          const subfolderData = processFolder(subfolderPath);
          if (subfolderData) {
            data = [...data, ...subfolderData];
          }
        }
      }
  
      if (data.length > 0) {
        const filename = join(dirname(directoryPath), `${basename(directoryPath)}`);
  
        writeToFile(`${filename}.csv`, convertToCSV(data));
        console.log(`CSV file "${filename}.csv" created successfully.`);
  
        writeToFile(`${filename}.json`, JSON.stringify(data, null, 4));
        console.log(`JSON file "${filename}.json" created successfully.`);
        
        // Send the data to Airtable
        for (const item of data) {
            const pathParts = item.format.filename.split('/');
            const device = pathParts[pathParts.length - 2]; 
            const shoot = pathParts[pathParts.length - 3]
          base(process.env.FFPROBE_DATA_FIELD).create([
            {
              "fields": {
                "filename": basename(item.format.filename),
                "shoot": shoot,
                "device": device,
                "codec_name": item.streams[0].codec_name,
                "profile": item.streams[0].profile,
                "codec_type": item.streams[0].codec_type,
                "width": item.streams[0].width,
                "height": item.streams[0].height,
                "pix_fmt": item.streams[0].pix_fmt,
                "color_space": item.streams[0].color_space,
                "color_transfer": item.streams[0].color_transfer,
                "color_primaries": item.streams[0].color_primaries,
                "time_base": item.streams[0].time_base,
                "duration_ts": item.streams[0].duration_ts,
                "duration": parseInt(item.streams[0].duration),
                "bit_rate": item.streams[0].bit_rate,
                "bits_per_raw_sample": item.streams[0].bits_per_raw_sample,
                "creation_time": item.streams[0].tags.creation_time,
                "timecode": item.streams[0].tags.timecode,
                "json": JSON.stringify(item, null, 4)
                // Add more fields as necessary
              }
            },
            // Add more records as necessary
          ], function(err, records) {
            if (err) {
              console.error(err);
              return;
            }
            records.forEach(function (record) {
              console.log(record.getId());
            });
          });
        }
      } else {
        console.log('No video files found in the shootfolder.');
      }
    } catch (error) {
      console.error(`Error accessing shootfolder: ${error}`);
      process.exit(1);
    }
  }

// Process all video files in a folder and return data as an array of objects
function processFolder(folderPath) {
    try {
      const files = readdirSync(folderPath);
      const data = [];

      for (const file of files) {
        const filePath = join(folderPath, file);
        const stats = statSync(filePath);

        if (stats.isFile() && isVideoFile(file)) {
          const ffprobeData = processVideoFile(filePath);
          if (ffprobeData) {
            data.push(ffprobeData);
          }
        }
      }

      return data;
    } catch (error) {
      console.error(`Error accessing folder: ${error}`);
      process.exit(1);
    }
}
  
// Process a single video file
function processVideoFile(videoFilePath) {
  const ffprobeProcess = spawnSync('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    videoFilePath
  ]);

  if (ffprobeProcess.error) {
    console.error(`Error executing ffprobe: ${ffprobeProcess.error.message}`);
    return;
  }

  if (ffprobeProcess.status !== 0) {
    console.error(`ffprobe process exited with code ${ffprobeProcess.status}`);
    return;
  }

  try {
    const ffprobeOutput = ffprobeProcess.stdout.toString();
    const ffprobeData = JSON.parse(ffprobeOutput);
    return ffprobeData;
  } catch (parseError) {
    console.error(`Error parsing ffprobe output: ${parseError}`);
  }
}

// Check if a file has a video extension
function isVideoFile(filename) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v']; // Add more extensions if needed
  const ext = extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
}

// Convert an array of objects to CSV format
function convertToCSV(data) {
    const csv = data.map(row => 
      keysToWrite.map(key => {
        const keyParts = key.split('.');
        let value = row;
        for (const part of keyParts) {
          value = value[part];
          if (value === undefined) {
            break;
          }
        }
        return JSON.stringify(value || '');
      }).join(',')
    );
    return [keysToWrite.join(','), ...csv].join('\n');
  }
// Write data to a file
function writeToFile(filename, data) {
  try {
    writeFileSync(filename, data);
  } catch (error) {
    throw new Error(`Error writing to file: ${error}`);
  }
}



// Run the script on the top-level directory
processTopLevelDirectory(topLevelDirectory);
