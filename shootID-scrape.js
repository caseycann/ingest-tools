/* ---------------------------------------------
 * sync.js
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
 * Helper function to check "YYYY_MM" with optional letter suffix.
 * Examples:
 *   2024_05   (valid)
 *   2024_05a  (valid)
 *   2024_05xyz (valid, if you allow multiple letters)
 * Adjust [a-zA-Z]* to [a-zA-Z]? if you only want one letter max.
 */
function isValidYearMonth(folderName) {
  // Four digits + underscore + two-digit month (01–12) + optional letters
  return /^\d{4}_(0[1-9]|1[0-2])[a-zA-Z]?$/.test(folderName);
}

/* ---------------------------------------------
 * 2. Main function: Scan directories & create records
 * --------------------------------------------- */
export async function scanDirectoryAndSync(rootPath) {
  // Since 'rootPath' is now the volume endpoint, derive the 'volume' name:
  const volume = path.basename(rootPath);
  console.log(`\nUsing ${rootPath} as volume path`);
  console.log(`Volume name: ${volume}\n`);

  // 1. List "month" folders under the volume
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
      console.log(`Skipping file: ${monthFolder}`);
      continue;
    }
    console.log('Processing monthFolder:', monthFolder);

    // 2. List "day" folders
    const dayFolders = await fs.readdir(monthFolderPath);
    console.log('Day folders in', monthFolder, ':', dayFolders);

    for (const dayFolder of dayFolders) {
      const dayFolderPath = path.join(monthFolderPath, dayFolder);
      const statDay = await fs.lstat(dayFolderPath);

      if (!statDay.isDirectory()) {
        console.log(`Skipping file: ${dayFolder}`);
        continue;
      }
      console.log('Processing dayFolder:', dayFolder);

      // 3. List "shoot" folders
      const shootFolders = await fs.readdir(dayFolderPath);
      console.log('Shoot folders in', dayFolder, ':', shootFolders);

      for (const shootFolder of shootFolders) {
        const shootFolderPath = path.join(dayFolderPath, shootFolder);
        const statShoot = await fs.lstat(shootFolderPath);

        if (!statShoot.isDirectory()) {
          console.log(`Skipping file: ${shootFolder}`);
          continue;
        }
        console.log('Processing shootFolder:', shootFolder);

        // Calculate folder size
        const sizeGB = await calculateFolderSize(shootFolderPath);
        console.log(`Calculated size for: ${shootFolderPath} = ${sizeGB} GB`);

        // 4. Create a new record for this shoot folder
        try {
          const createdRecord = await base(TABLE_NAME).create(
            [
              {
                fields: {
                  // Adjust field names here to match your schema
                  'ShootID': shootFolder,
                  'Volume': volume,  // single select field in Airtable
                  'Size': sizeGB,
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
}
