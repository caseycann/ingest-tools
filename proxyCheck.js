
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import Airtable from 'airtable';
import { all } from 'axios';

const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_SINGEST_BASE);

const DIRECTORY_PATH = process.argv[2];

if (!DIRECTORY_PATH) {
    console.error("Please provide a directory path.");
    process.exit(1);
}

const getRecordIdByShootID = async (shootID) => {
    try {
        let recordId = null;
        await base('Shoots').select({
            maxRecords: 1,
            view: 'ProxyCheck',
            filterByFormula: `{ShootID} = '${shootID}'`
        }).firstPage((records, fetchNextPage) => {
            console.log(`Records returned for ShootID ${shootID}:`, records); // Log the returned records
            if (records.length > 0) {
                recordId = records[0].getId();
            }
        });
        return recordId;
    } catch (err) {
        console.error(`Error fetching record by ShootID ${shootID}:`, err);
        throw err;
    }
};

const updatePresentInAirtable = async (shootID) => {
    try {
        const recordId = await getRecordIdByShootID(shootID);
        if (recordId) {
            base('Shoots').update([
                {
                    id: recordId,
                    fields: {
                        "proxyPresent": true  // Mark the proxy as present
                    }
                }
            ], (err, records) => {
                if (err) {
                    console.error(err);
                    throw err; 
                }
                console.log(`Updated record for present folder with ShootID: ${shootID}`);
            });
        } else {
            console.warn(`No record found for ShootID: ${shootID}`);
        }
    } catch (err) {
        console.error("Error updating record in Airtable:", err);
    }
};

const checkPresentFolders = async () => {
    const existingFolders = fs.readdirSync(DIRECTORY_PATH);

    for (const folder of existingFolders) {
        // Strip out the '_proxy' to get the potential ShootID
        const potentialShootID = folder.replace('_proxy', '');
        
        // Log out the extracted ShootID
        console.log(`Checking for ShootID: ${potentialShootID}`);

        // Now proceed with the logic to check this ShootID in Airtable
        await updatePresentInAirtable(potentialShootID);
    }
};

checkPresentFolders();

// const fetchAndLogAllRecords = async () => {
//     try {
//         let allRecords = [];

//         // Fetch records and push into the allRecords array
//         await base('Shoots').select().eachPage((partialRecords, fetchNextPage) => {
//             allRecords.push(...partialRecords);
//             fetchNextPage();
//         });

//         // Log all fetched records
//         // console.log(JSON.stringify(allRecords, null, 4));
//         console.log(allRecords[0].fields)

//     } catch (err) {
//         console.error('Error fetching all records:', err);
//     }
// };

// // Call the function to print out all records
// fetchAndLogAllRecords();
