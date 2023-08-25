import { exec } from 'child_process';
import fs from 'fs';

function printJSON(videoFilePath) {
    const outputFilePath = videoFilePath + '.json';

    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoFilePath}"`;

    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error('Error while fetching metadata:', err.message);
            return;
        }

        fs.writeFile(outputFilePath, stdout, (err) => {
            if (err) {
                console.error('Error while writing JSON to file:', err);
                return;
            }
            console.log(`Metadata written to: ${outputFilePath}`);
        });
    });
}

// Export the function
export { printJSON };
