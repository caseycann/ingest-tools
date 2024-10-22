import fs from 'fs';
import path from 'path';
import chalk from 'chalk'; // Import chalk for color-coded output

export function checkRename(directory) {
    // Regex pattern for YYYY_MM folder names
    const validMonthFolderPattern = /^\d{4}_\d{2}$/;

    // Function to recursively check all folders and validate filenames
    function checkDirectory(currentPath) {
        const items = fs.readdirSync(currentPath);

        items.forEach((item) => {
            const itemPath = path.join(currentPath, item);
            const stat = fs.lstatSync(itemPath);

            if (stat.isDirectory()) {
                // If it's a directory, recurse into it
                checkDirectory(itemPath);
            } else if (stat.isFile()) {
                // Ignore hidden files (files starting with '.') and .txt files
                if (item.startsWith('.') || path.extname(item) === '.txt') return;

                // If it's a file, validate its name
                const parentFolder = path.basename(path.dirname(itemPath)); // Get the device folder name
                const shootFolder = path.basename(path.dirname(path.dirname(itemPath))); // Get the shoot folder name

                // Check if the device folder contains 'garageband' or 'hijack'
                if (parentFolder.toLowerCase().includes('garageband') || parentFolder.toLowerCase().includes('hijack')) {
                    // console.log(chalk.blue(`Skipping file in excluded folder: ${itemPath}`));
                    return;
                }

                // Proceed with name validation if not in excluded folders
                const expectedFileNameStart = `${shootFolder}_${parentFolder}`;
                if (!item.startsWith(expectedFileNameStart)) {
                    console.log(chalk.red(`Inconsistent file: ${itemPath}`)); // Color inconsistent filenames in red
                }
            }
        });
    }

    // Read root directory and filter out folders not matching the YYYY_MM pattern
    const rootItems = fs.readdirSync(directory);
    rootItems.forEach((item) => {
        const itemPath = path.join(directory, item);
        const stat = fs.lstatSync(itemPath);

        if (stat.isDirectory()) {
            // Check if the directory matches the YYYY_MM format
            if (validMonthFolderPattern.test(item)) {
                console.log(chalk.green(`Processing folder: ${item}`)); // Color valid folder names in green
                checkDirectory(itemPath);
            } else {
                console.log(chalk.yellow(`Skipping inconsistent folder name: ${item}`)); // Color skipped folder names in yellow
            }
        }
    });

    console.log(chalk.blue('File consistency check complete.'));
}
