import { renameSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
const originalToNewNames = {};
// let shootFolderPath = process.argv[2]

function renameFile(filePath, subfolder, deviceSubfolder, counters) {
  const fileStats = statSync(filePath);
  if (fileStats.isFile()) {
      const newFileName = `${subfolder}_${deviceSubfolder}.${String(counters[deviceSubfolder]+1).padStart(4, '0')}${extname(filePath)}`;
      const newFilePath = join(dirname(filePath), newFileName);
      try {
        renameSync(filePath, newFilePath);
        // console.log(`Renamed file from: ${filePath} to: ${newFilePath}`);

        originalToNewNames[newFilePath] = basename(filePath); // Correcting the map population
  
    } catch (error) {
        console.error(`Error renaming file from: ${filePath} to: ${newFilePath}. Error: ${error.message}`);
    }
  }
}

  
  function processDirectory(directory, subfolder = basename(directory), deviceSubfolder = null, counters = {}) {
    const entries = readdirSync(directory);
  
    for (const entry of entries) {
        const entryPath = join(directory, entry);
        const stats = statSync(entryPath);
  
        if (entry === '.DS_Store') continue;
  
        if (stats.isDirectory()) {
            if (!deviceSubfolder) {
                processDirectory(entryPath, subfolder, entry, counters);
            } else {
                processDirectory(entryPath, subfolder, deviceSubfolder, counters);
            }
        } else {
            if (!counters[deviceSubfolder]) counters[deviceSubfolder] = 0;
            renameFile(entryPath, subfolder, deviceSubfolder, counters);
            counters[deviceSubfolder]++;
        }
    }
  }
  
  
  function renameShoot(shootFolderPath) {
    // console.log(`Processing shoot folder: ${shootFolderPath}`);
    processDirectory(shootFolderPath);
    // console.log(originalToNewNames)
    return shootFolderPath;
  }

//   renameShoot(shootFolderPath)
  export default renameShoot