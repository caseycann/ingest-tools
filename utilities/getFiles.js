import fs from 'fs'
import path from 'path'

function getFilesFromDirectory(directory) {
    let results = [];

    fs.readdirSync(directory).forEach((file) => {
        if (file === '.DS_Store') { // Ignore .DS_Store file
            return;
        }

        const fullPath = path.resolve(directory, file);

        if (fs.statSync(fullPath).isDirectory()) {
            // If the current path is a directory, recurse it
            results = results.concat(getFilesFromDirectory(fullPath));
        } else {
            // Otherwise, push the file onto the result array
            results.push(fullPath);
        }
    });

    return results;
}

// usage:
const files = getFilesFromDirectory(process.argv[2]);
console.log(files);