/* ---------------------------------------------
 * sync.js
 * --------------------------------------------- */
import dotenv from 'dotenv';
dotenv.config();  // <-- load environment variables from .env

import fs from 'fs-extra';
import path from 'path';
import Airtable from 'airtable';

// Import your calculateFolderSize utility from utilities/
import { calculateFolderSize } from './utilities/calculateFolderSize.js';

/* ---------------------------------------------
 * 1. Configure Airtable connection
 * --------------------------------------------- */
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const SHOOTID_BASE_ID = process.env.SHOOTID_BASE_ID;
const TABLE_NAME = 'tblZVIujC0KE1Ih4U'; // The table in Airtable
// (We no longer need a VOLUMES_TABLE_NAME since we're using a single select)

Airtable.configure({
  apiKey: AIRTABLE_API_KEY,
});

const base = Airtable.base(SHOOTID_BASE_ID);

/* ---------------------------------------------
 * 2. Main function: Scan directories & create records
 * --------------------------------------------- */
export async function scanDirectoryAndSync(rootPath) {
  // 1. List all volumes (top-level folders)
  const volumes = await fs.readdir(rootPath);
  console.log('Volumes:', volumes);

  for (const volume of volumes) {
    const volumePath = path.join(rootPath, volume);
    const statVolume = await fs.lstat(volumePath);

    if (!statVolume.isDirectory()) {
      console.log(`Skipping file: ${volume}`);
      continue;
    }
    console.log('Processing volume:', volume);

    // 2. List "month" folders under the volume
    const monthFolders = await fs.readdir(volumePath);
    console.log('Month folders in', volume, ':', monthFolders);

    for (const monthFolder of monthFolders) {
      const monthFolderPath = path.join(volumePath, monthFolder);
      const statMonth = await fs.lstat(monthFolderPath);

      if (!statMonth.isDirectory()) {
        console.log(`Skipping file: ${monthFolder}`);
        continue;
      }
      console.log('Processing monthFolder:', monthFolder);

      // 3. List "day" folders
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

        // 4. List "shoot" folders
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

          // 5. Create a new record for this shoot folder
          try {
            const createdRecord = await base(TABLE_NAME).create(
              [
                {
                  fields: {
                    'ShootID': shootFolder,
                    'Volume': volume, // single select field
                    'Size': sizeGB,
                  },
                },
              ],
              { typecast: true } // <-- Add this object
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
}
