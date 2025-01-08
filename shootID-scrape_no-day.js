/* ---------------------------------------------
 * sync.js (No "day" level) + Month Folder Filter
 * --------------------------------------------- */
import dotenv from 'dotenv';
dotenv.config();  // <-- load environment variables from .env

import fs from 'fs-extra';
import path from 'path';
import Airtable from 'airtable';
import { calculateFolderSize } from './utilities/calculateFolderSize.js';

/* ---------------------------------------------
 * 1. Configure Airtable connection
 * --------------------------------------------- */
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const SHOOTID_BASE_ID = process.env.SHOOTID_BASE_ID;
const TABLE_NAME = 'tblZVIujC0KE1Ih4U'; // The table in Airtable

Airtable.configure({
  apiKey: AIRTABLE_API_KEY,
});

const base = Airtable.base(SHOOTID_BASE_ID);

/**
 * Helper function to check "YYYY_MM" naming scheme.
 * - Year: 4 digits
 * - Month: 2 digits (01-12)
 */
function isValidYearMonth(folderName) {
  // This regex enforces a 4-digit year, an underscore,
  // and a month from 01 to 12.
  return /^\d{4}_(0[1-9]|1[0-2])[a-zA-Z]?$/.test(folderName);
}

/* ---------------------------------------------
 * 2. Main function: Scan directories & create records
 * --------------------------------------------- */
export async function scanDirectoryAndSyncNoDay(rootPath) {
  // Since 'rootPath' is now the volume endpoint, derive the volume name:
  const volume = path.basename(rootPath);
  console.log(`\nUsing ${rootPath} as volume path`);
  console.log(`Volume name: ${volume}\n`);

  // 1. List "month" folders directly under the volume
  const monthFolders = await fs.readdir(rootPath);
  console.log('Month folders in', volume, ':', monthFolders);

  for (const monthFolder of monthFolders) {
    // Check naming scheme before proceeding
    if (!isValidYearMonth(monthFolder)) {
      console.log(`[Skipping invalid month folder name: ${monthFolder}]`);
      continue;
    }

    const monthFolderPath = path.join(rootPath, monthFolder);
    const statMonth = await fs.lstat(monthFolderPath);

    if (!statMonth.isDirectory()) {
      console.log(`Skipping file (not a directory): ${monthFolder}`);
      continue;
    }
    console.log('Processing monthFolder:', monthFolder);

    // 2. List "shoot" folders directly under the month folder
    const shootFolders = await fs.readdir(monthFolderPath);
    console.log('Shoot folders in', monthFolder, ':', shootFolders);

    for (const shootFolder of shootFolders) {
      const shootFolderPath = path.join(monthFolderPath, shootFolder);
      const statShoot = await fs.lstat(shootFolderPath);

      if (!statShoot.isDirectory()) {
        console.log(`Skipping file: ${shootFolder}`);
        continue;
      }
      console.log('Processing shootFolder:', shootFolder);

      // Calculate folder size
      const sizeGB = await calculateFolderSize(shootFolderPath);
      console.log(`Calculated size for: ${shootFolderPath} = ${sizeGB} GB`);

      // 3. Create a new record for this shoot folder
      try {
        const createdRecord = await base(TABLE_NAME).create(
          [
            {
              fields: {
                // Adjust field names here to match your schema
                ShootID: shootFolder,
                Volume: volume,     // single select field in Airtable
                Size: sizeGB,
              },
            },
          ],
          { typecast: true }
        );
      
        console.log(
          `Created record for shoot: ${shootFolder} [Volume: ${volume}, Size: ${sizeGB.toFixed(
            2
          )} GB] (Record ID: ${createdRecord[0].id})`
        );
      } catch (err) {
        console.error(`Error creating Airtable record for ${shootFolder}:`, err);
      }
    }
  }
}
