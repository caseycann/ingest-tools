// import dotenv from 'dotenv';
// dotenv.config();
import { renameSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname, parse } from 'path';
import getFileType from './utilities/getFileType.js';
import { pushAudioDataToAT, pushImageDataToAT, pushVideoDataToAT } from './utilities/pushData.js';
import getShootRecordID from './utilities/getShootRecordID.js';
import { processAudioFile, processImageFile, processVideoFile } from './utilities/processFile.js';
import renameShoot from './utilities/renameShoot.js';
import extractShootID from './utilities/getShootID.js'; 



async function processItemData(item) {
  
  console.log()

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
          fileData.originalFileName = originalFileNames[filePath];
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
          originalNames[filePath] = file;
        }
      }
    }
  }

  return originalNames;
}

async function pushShoottoAT(directoryPath) {
  const originalToNewNames = await storeOriginalFilenames(directoryPath);

  console.log("Original to New Names Mapping:", originalToNewNames);

  renameShoot(directoryPath);

  const subfolders = readdirSync(directoryPath);
  for (const subfolder of subfolders) {
    const subfolderPath = join(directoryPath, subfolder);
    const stats = statSync(subfolderPath);
    if (stats.isDirectory()) {
      const data = await processFolder(subfolderPath, originalToNewNames);   // Pass the original filenames mapping
      if (data) {
        for (const item of data) {
          await processItemData({...item, originalFileName: originalToNewNames[item.filePath]});   // Use the original filename from mapping
        }
      }
    }
  }
}


export { pushShoottoAT };
