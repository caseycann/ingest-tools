
import { renameSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname, parse } from 'path';
import getFileType from './utilities/getFileType.js';
import { pushAudioDataToAT, pushImageDataToAT, pushVideoDataToAT } from './utilities/pushData.js';
import getShootRecordID from './utilities/getShootRecordID.js';
import { processAudioFile, processImageFile, processVideoFile } from './utilities/processFile.js';
const originalToNewNames = {};


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


async function processItemData(item) {
  if (!item.format || !item.data || !item.shoot || !item.shootRecordID || !item.device || !item.originalFileName) {
    console.error("Unexpected item structure:", item);
    return;
  }
  const {data, device, originalFileName, shoot, shootRecordID} = item;
  switch (item.format) {
    case 'image':
      await pushImageDataToAT(data, shoot, shootRecordID, device, originalFileName);
      break;
    case 'audio':
      await pushAudioDataToAT(data, shoot, shootRecordID, device, originalFileName);
      break;
    case 'video':
      await pushVideoDataToAT(data, shoot, shootRecordID, device, originalFileName);
      break;
    default:
      console.error("Unsupported format:", item.format);
      break;
  }
}


async function processFolder(folderPath, originalFileNames) {
  const files = readdirSync(folderPath);
  const data = [];
  for (const file of files) {
    const filePath = join(folderPath, file);
    const stats = statSync(filePath);
    if (stats.isFile()) {
      let fileFormat = getFileType(file); // get the file format

      if (fileFormat) { // Check if fileFormat is valid before entering switch case
        let fileData;
        let shoot = basename(dirname(dirname(filePath))); // replace with your 'shoot' value 
        let shootRecordID = await getShootRecordID(shoot)
        let device = basename(folderPath)

        switch(fileFormat) {
          case "video":
            fileData = processVideoFile(filePath, file);
            break;
          case "image":
            fileData = processImageFile(filePath, file);
            break;
          case "audio":
            fileData = processAudioFile(filePath, file);
            break;
        }
        if (fileData) {
          fileData.format = fileFormat;
          fileData.data = fileData
          fileData.shoot = shoot;
          fileData.shootRecordID = shootRecordID;
          fileData.device = device;
          fileData.originalFileName = basename(originalFileNames[filePath]);
          fileData.filePath = filePath; // Add filePath to the file data
          data.push(fileData);
        }
      }
    }
  }
  return data;
}


async function storeOriginalFilenames(directoryPath) {
  const subfolders = readdirSync(directoryPath);
  let originalNames = {};

  for (const subfolder of subfolders) {
    const subfolderPath = join(directoryPath, subfolder);
    const stats = statSync(subfolderPath);
    if (stats.isDirectory()) {
      const files = readdirSync(subfolderPath);
      for (const file of files) {
        const filePath = join(subfolderPath, file);
        const stats = statSync(filePath);
        if (stats.isFile()) {
          originalNames[filePath] = file; // store the original file path and name before renaming
        }
      }
    }
  }
  return originalNames;
}



async function pushShoottoAT(directoryPath) {
  const originalFileNames = await storeOriginalFilenames(directoryPath);
  renameShoot(directoryPath);
  const subfolders = readdirSync(directoryPath);
  for (const subfolder of subfolders) {
    const subfolderPath = join(directoryPath, subfolder);
    const stats = statSync(subfolderPath);
    if (stats.isDirectory()) {
      // Process the folder after renaming the shoot and storing the original filenames
      const data = await processFolder(subfolderPath, originalToNewNames); 
      if (data) {
        for (const item of data) {
          const originalFileName = originalToNewNames[item.filePath]
          console.log("___________________", originalFileName)
          await processItemData({...item, originalFileName});
        }
      }
    }
  }
}



export { pushShoottoAT };
