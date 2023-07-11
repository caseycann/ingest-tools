import { spawnSync } from 'child_process';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

// Retrieve the path from the command line arguments
const monthLevelDirectory = process.argv[2];

// Check if a path was provided
if (!monthLevelDirectory) {
  console.error('Please provide the path to the month-level folder.');
  process.exit(1);
}

// Determine if the provided path is a directory
try {
  const stats = statSync(monthLevelDirectory);
  if (!stats.isDirectory()) {
    console.error('Invalid path. Please provide a valid path to a directory.');
    process.exit(1);
  }
} catch (error) {
  console.error(`Error accessing path: ${error}`);
  process.exit(1);
}

// Process all camera-level folders in a shoot-level folder and return CSV data
function processShootLevelFolder(shootLevelFolderPath, dayLevelFolderPath) {
    try {
      const cameraLevelFolders = readdirSync(shootLevelFolderPath);
      const csvData = [];
  
      for (const cameraLevelFolder of cameraLevelFolders) {
        const cameraLevelFolderPath = join(shootLevelFolderPath, cameraLevelFolder);
        const stats = statSync(cameraLevelFolderPath);
  
        if (stats.isDirectory()) {
          const cameraLevelFolderData = processCameraLevelFolder(cameraLevelFolderPath);
          if (cameraLevelFolderData) {
            csvData.push(cameraLevelFolderData);
          }
        }
      }
  
      if (csvData.length > 0) {
        const csvFilename = join(dayLevelFolderPath, `${basename(shootLevelFolderPath)}.csv`); // Update the path here
        const combinedCsvData = csvData.join('\n');
        writeToFile(csvFilename, combinedCsvData);
        console.log(`CSV file "${csvFilename}" created successfully.`);
      } else {
        console.log(`No camera-level folders found in ${shootLevelFolderPath}.`);
      }
    } catch (error) {
      console.error(`Error accessing folder: ${error}`);
      process.exit(1);
    }
  }
// Process all video files in a camera-level folder and return CSV data
function processCameraLevelFolder(cameraLevelFolderPath) {
  try {
    const files = readdirSync(cameraLevelFolderPath);
    const folderName = basename(cameraLevelFolderPath);

    let csvData = '';

    for (const file of files) {
      const filePath = join(cameraLevelFolderPath, file);
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

// Process all camera-level folders in a day-level folder and return CSV data
function processDayLevelFolder(dayLevelFolderPath) {
  try {
    const shootLevelFolders = readdirSync(dayLevelFolderPath);

    for (const shootLevelFolder of shootLevelFolders) {
      const shootLevelFolderPath = join(dayLevelFolderPath, shootLevelFolder);
      const stats = statSync(shootLevelFolderPath);

      if (stats.isDirectory()) {
        processShootLevelFolder(shootLevelFolderPath);
      }
    }
  } catch (error) {
    console.error(`Error accessing folder: ${error}`);
    process.exit(1);
  }
}

// Process all day-level folders in the month-level directory
function processMonthLevelFolder(monthLevelFolderPath) {
    try {
      const dayLevelFolders = readdirSync(monthLevelFolderPath);
  
      for (const dayLevelFolder of dayLevelFolders) {
        const dayLevelFolderPath = join(monthLevelFolderPath, dayLevelFolder);
        const stats = statSync(dayLevelFolderPath);
  
        if (stats.isDirectory()) {
          const shootLevelFolders = readdirSync(dayLevelFolderPath);
  
          for (const shootLevelFolder of shootLevelFolders) {
            const shootLevelFolderPath = join(dayLevelFolderPath, shootLevelFolder);
            const stats = statSync(shootLevelFolderPath);
  
            if (stats.isDirectory()) {
              processShootLevelFolder(shootLevelFolderPath, dayLevelFolderPath);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error accessing folder: ${error}`);
      process.exit(1);
    }
  }

// Run the script on the month-level directory
processMonthLevelFolder(monthLevelDirectory);
