import dotenv from 'dotenv';
dotenv.config();
import Airtable from 'airtable';
const base = new Airtable(process.env.AIRTABLE_API_KEY).base(process.env.AIRTABLE_BASE_ID);

let shootID = process.argv[2]

async function getShootRecordID(shootID) {
    return new Promise((resolve, reject) => {
        base(process.env.SHOOTS_TABLE).select({
            filterByFormula: `{ShootID} = '${shootID}'`,
            maxRecords: 1,
            view: "MAIN"
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
                // console.log("Found record:", JSON.stringify(record, null, 4));
                resolve(record.id);  // Resolve the Promise with the record ID
            });

            fetchNextPage();

        }, function done(err) {
            if (err) { 
                console.error(err); 
                reject(err);  // Reject the Promise if there's an error
                return;
            }
            resolve(null);  // No matching record found, resolve with null
        });
    });
}

// getShootRecordID(shootID).then(id => console.log("Airtable Record ID: ", id));  
export default getShootRecordID;