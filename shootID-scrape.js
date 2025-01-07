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
const TABLE_NAME = 'tblZVIujC0KE1Ih4U';         // The name of the table in Airtable
const VOLUMES_TABLE_NAME = 'tblginuhTkiLKcxKw'; // Volumes table name

Airtable.configure({
  apiKey: AIRTABLE_API_KEY,
});

const base = Airtable.base(SHOOTID_BASE_ID);

/* ---------------------------------------------
 * 2. Fetch or create a Volume record (linked record)
 * --------------------------------------------- */
async function findOrCreateVolumeRecord(volumeName) {
  const existingRecords = await base(VOLUMES_TABLE_NAME)
    .select({
      filterByFormula: `{Name} = "${volumeName}"`,
      maxRecords: 1,
    })
    .firstPage();

  if (existingRecords.length > 0) {
    // Return the existing record's ID
    return existingRecords[0].id;
  } else {
    // Create a new record for this volume
    const created = await base(VOLUMES_TABLE_NAME).create([
      {
        fields: { 'Name': volumeName },
      },
    ]);
    return created[0].id;
  }
}

/* ---------------------------------------------
 * 3. Fetch or create a Shoot record
 * --------------------------------------------- */
async function findOrCreateShootRecord(shootFolder) {
  const existingRecords = await base(TABLE_NAME)
    .select({
      filterByFormula: `{Name} = "${shootFolder}"`,
      maxRecords: 1,
    })
    .firstPage();

  if (existingRecords.length > 0) {
    return existingRecords[0];
  } else {
    const created = await base(TABLE_NAME).create([
      {
        fields: { 'Name': shootFolder },
      },
    ]);
    return created[0];
  }
}

/* ---------------------------------------------
 * 4. Main function to scan directories
 * --------------------------------------------- */
export async function scanDirectoryAndSync(rootPath) {
  // 1. List all volumes
  const volumes = await fs.readdir(rootPath);
  console.log('Volumes:', volumes);  // <-- Log the volumes array

  for (const volume of volumes) {
    const volumePath = path.join(rootPath, volume);
    const statVolume = await fs.lstat(volumePath);

    if (!statVolume.isDirectory()) {
      console.log(`Skipping file: ${volume}`); // <--
      continue;
    }
    console.log('Processing volume:', volume); // <--

    // 2. List the month folders
    const monthFolders = await fs.readdir(volumePath);
    console.log('Month folders in', volume, ':', monthFolders); // <--

    for (const monthFolder of monthFolders) {
      const monthFolderPath = path.join(volumePath, monthFolder);
      const statMonth = await fs.lstat(monthFolderPath);

      if (!statMonth.isDirectory()) {
        console.log(`Skipping file: ${monthFolder}`); // <--
        continue;
      }
      console.log('Processing monthFolder:', monthFolder); // <--

      // 3. List the day folders
      const dayFolders = await fs.readdir(monthFolderPath);
      console.log('Day folders in', monthFolder, ':', dayFolders); // <--

      for (const dayFolder of dayFolders) {
        const dayFolderPath = path.join(monthFolderPath, dayFolder);
        const statDay = await fs.lstat(dayFolderPath);

        if (!statDay.isDirectory()) {
          console.log(`Skipping file: ${dayFolder}`); // <--
          continue;
        }
        console.log('Processing dayFolder:', dayFolder); // <--

        // 4. List the shoot folders
        const shootFolders = await fs.readdir(dayFolderPath);
        console.log('Shoot folders in', dayFolder, ':', shootFolders); // <--

        for (const shootFolder of shootFolders) {
          const shootFolderPath = path.join(dayFolderPath, shootFolder);
          const statShoot = await fs.lstat(shootFolderPath);

          if (!statShoot.isDirectory()) {
            console.log(`Skipping file: ${shootFolder}`); // <--
            continue;
          }
          console.log('Processing shootFolder:', shootFolder); // <--

          // All the logic (calculate size, update Airtable, etc.)
          const sizeGB = await calculateFolderSize(shootFolderPath);
          console.log(`Calculated size for: ${shootFolderPath} = ${sizeGB} GB`);

          // Find or create the shoot record in Airtable
          const shootRecord = await findOrCreateShootRecord(shootFolder);

          // Find or create the volume record
          const volumeRecordId = await findOrCreateVolumeRecord(volume);

          // Append the volume link to the existing "NAS Volume" field
          // (If your field name is actually "volume", adjust as needed)
          const existingVolumeLinks = shootRecord.get('volume') || [];
          if (!existingVolumeLinks.includes(volumeRecordId)) {
            existingVolumeLinks.push(volumeRecordId);
          }

          // Update the record with the new volume link + size
          // Adjust field names here to match your Airtable schema
          await base(TABLE_NAME).update([
            {
              id: shootRecord.id,
              fields: {
                'volume': existingVolumeLinks,
                'size': sizeGB,
              },
            },
          ]);

          console.log(
            `Synced shoot: ${shootFolder} [${volume}] (${sizeGB.toFixed(2)} GB)`
          );
        }
      }
    }
  }
}
