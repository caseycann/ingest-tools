import { spawnSync } from 'child_process';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

// Retrieve the path from the command line arguments
const topLevelDirectory = process.argv[2];

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
    const csvData = [];

    for (const subfolder of subfolders) {
      const subfolderPath = join(directoryPath, subfolder);
      const stats = statSync(subfolderPath);

      if (stats.isDirectory()) {
        const subfolderData = processFolder(subfolderPath);
        if (subfolderData) {
          csvData.push(subfolderData);
        }
      }
    }

    if (csvData.length > 0) {
      const csvFilename = join(dirname(directoryPath), `${basename(directoryPath)}.csv`);
      const combinedCsvData = csvData.join('\n');
      writeToFile(csvFilename, combinedCsvData);
      console.log(`CSV file "${csvFilename}" created successfully.`);
    } else {
      console.log('No video files found in the shootfolder.');
    }
  } catch (error) {
    console.error(`Error accessing shootfolder: ${error}`);
    process.exit(1);
  }
}

// Process all video files in a folder and return CSV data
function processFolder(folderPath) {
  try {
    const files = readdirSync(folderPath);
    const folderName = basename(folderPath);

    let csvData = '';

    for (const file of files) {
      const filePath = join(folderPath, file);
      const stats = statSync(filePath);

      if (stats.isFile() && isVideoFile(file)) {
        const ffprobeData = processVideoFile(filePath);
        if (ffprobeData) {
          csvData += convertToCSV(ffprobeData, folderName);
        }
      }
    }

    return csvData;
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

// Convert the JSON object to CSV format
function convertToCSV(data, folderName) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  let csv = '';
  for (let i = 0; i < keys.length; i++) {
    csv += `${folderName},${keys[i]},${JSON.stringify(values[i])}\n`;
  }
  return csv;
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
