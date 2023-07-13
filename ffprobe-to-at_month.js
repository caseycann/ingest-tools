import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// This is the path to the first script file. Update this if necessary.
const scriptPath = './ffprobe-to-AT_shoot.js';

// The main function that processes the directories
async function pushMonth(monthLevelDirectory) {
  // Check if a path was provided
  if (!monthLevelDirectory) {
    console.error('Please provide the path to the month-level folder.');
    return;
  }

  // Determine if the provided path is a directory
  try {
    const stats = statSync(monthLevelDirectory);
    if (!stats.isDirectory()) {
      console.error('Invalid path. Please provide a valid path to a directory.');
      return;
    }
  } catch (error) {
    console.error(`Error accessing path: ${error}`);
    return;
  }

  const dayDirectories = readdirSync(monthLevelDirectory).filter(dayDirectory => {
    return statSync(join(monthLevelDirectory, dayDirectory)).isDirectory();
  });

  for (const dayDirectory of dayDirectories) {
    const dayDirectoryPath = join(monthLevelDirectory, dayDirectory);
    const shootDirectories = readdirSync(dayDirectoryPath).filter(shootDirectory => {
      return statSync(join(dayDirectoryPath, shootDirectory)).isDirectory();
    });

    for (const shootDirectory of shootDirectories) {
      const shootDirectoryPath = join(dayDirectoryPath, shootDirectory);
      const process = spawn('node', [scriptPath, shootDirectoryPath]);
      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });
    }
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const monthLevelDirectory = process.argv[2];
  pushMonth(monthLevelDirectory);
}

// Export the pushMonth function so it can be imported and run from other scripts
export default pushMonth;
