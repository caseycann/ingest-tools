// volumeSync.js
import dotenv from 'dotenv';
dotenv.config(); // Loads environment variables from .env

import fs from 'fs-extra';
import path from 'path';
import Airtable from 'airtable';
import { calculateFolderSize } from './utilities/calculateFolderSize.js';

/* ---------------------------------------------
 * Airtable Setup
 * --------------------------------------------- */
const { AIRTABLE_API_KEY, SHOOTID_BASE_ID } = process.env; 

const TABLE_NAME = 'tblxWhh3N8tcraoUC'; // Replace with your table ID or name

Airtable.configure({
  apiKey: AIRTABLE_API_KEY,
});

const base = Airtable.base(SHOOTID_BASE_ID);

/* ---------------------------------------------
 * Main function: Scan the NAS volume folder
 * --------------------------------------------- */
export async function scanVolumeAndSync(volumePath) {
  // The volume name is just the folder name at the end of `volumePath`
  const volumeName = path.basename(volumePath);
  console.log(`\nScanning volume: ${volumeName}`);
  console.log(`Absolute path: ${volumePath}\n`);

  // Get a list of everything in the volumePath
  const subfolders = await fs.readdir(volumePath);

  for (const folder of subfolders) {
    const folderPath = path.join(volumePath, folder);

    // Check if it's really a directory (skip files, .DS_Store, etc.)
    const stats = await fs.lstat(folderPath);
    if (!stats.isDirectory()) {
      console.log(`Skipping file: ${folder}`);
      continue;
    }

    // Optionally skip hidden/system folders (like .DS_Store if it's a directory)
    if (folder.startsWith('.')) {
      console.log(`Skipping hidden folder: ${folder}`);
      continue;
    }

    // Calculate total folder size (in GB or whatever your function returns)
    const sizeGB = await calculateFolderSize(folderPath);
    console.log(`Folder: ${folder} (Size: ${sizeGB.toFixed(2)} GB)`);

    // Create a record in Airtable
    try {
      await base(TABLE_NAME).create(
        [
          {
            fields: {
              // Match your Airtable field names exactly:
              Directories: folder,
              Volume: volumeName,  // single select
              Size: sizeGB         // number
            },
          },
        ],
        { typecast: true } // allows new single select options if needed
      );

      console.log(`Airtable record created for: ${folder}`);
    } catch (err) {
      console.error(`Error creating record for ${folder}:`, err);
    }
  }

  console.log(`\nDone scanning volume: ${volumeName}\n`);
}
