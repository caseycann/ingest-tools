import { basename } from 'path';
// let filePath = process.argv[2]

function extractShootID(filepath) {
    // Extract filename
    const fileName = basename(filepath);

    // Split filename into parts
    const parts = fileName.split('_');

    // Remove the last part
    parts.pop();

    // Combine the remaining parts to form the ShootID
    const shootID = parts.join('_');

    return shootID;
}

export default extractShootID