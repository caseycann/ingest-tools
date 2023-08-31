import dotenv from 'dotenv';
dotenv.config();
import { promises as fs } from 'fs';
import path from 'path';
import Airtable from 'airtable';
import axios from 'axios';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_PHOTOVIDEO231_BASE;
const AIRTABLE_TABLE_NAME = 'Shoots';
const TOP_DIRECTORY_PATH = process.argv[2];

const AIRTABLE_ENDPOINT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

async function fetchShootIdsFromAirtable() {
    const records = [];
    let offset = null;

    while (true) {
        const response = await axios.get(AIRTABLE_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            params: offset ? { offset } : undefined,
        });

        records.push(...response.data.records);

        if (!response.data.offset) break;

        offset = response.data.offset;
    }

    return records;
}

async function fetchShootFolderNamesFromDirectory(monthPath) {
    const filesAndFolders = await fs.readdir(monthPath, { withFileTypes: true });
    return filesAndFolders
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name.replace('_proxy', ''));
}

async function fetchAllMonthDirectories(topPath) {
    const filesAndFolders = await fs.readdir(topPath, { withFileTypes: true });
    return filesAndFolders.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
}

async function updateAirtable(records, folderNames) {
    for (const record of records) {
        if (folderNames.includes(record.fields.ShootID)) {
            await axios.patch(AIRTABLE_ENDPOINT, {
                records: [
                    {
                        id: record.id,
                        fields: {
                            proxyPresent: true,
                        },
                    },
                ],
            }, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
        }
    }
}

(async () => {
    try {
        const records = await fetchShootIdsFromAirtable();
        const monthDirectories = await fetchAllMonthDirectories(TOP_DIRECTORY_PATH);

        for (const month of monthDirectories) {
            const monthPath = path.join(TOP_DIRECTORY_PATH, month);
            const shootFolders = await fetchShootFolderNamesFromDirectory(monthPath);

            await updateAirtable(records, shootFolders);
        }

        console.log('Process completed successfully.');
    } catch (err) {
        console.error('An error occurred:', err);
    }
})();