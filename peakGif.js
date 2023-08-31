import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const targetDir = process.argv[2];

// Recursively get video files (considering only .mp4 for simplicity)
function getVideoFiles(startPath) {
    let results = [];
    const files = fs.readdirSync(startPath);
    for(let i=0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            results = results.concat(getVideoFiles(filename)); // Recursion
        }
        else if (filename.endsWith(".mp4")) {
            results.push(filename);
        }
    }
    return results;
}

const videoFiles = getVideoFiles(targetDir);

videoFiles.forEach(file => {
    try {
        // Detect volume peaks
        const output = execSync(`ffmpeg -i "${file}" -af volumedetect -f null /dev/null 2>&1`).toString();
        const matched = output.match(/max_volume: (-?\d+\.\d+) dB/);
        if (matched && matched[1] && parseFloat(matched[1]) > -5.0) { // -5.0 dB can be considered as a threshold for "loud"
            // Extract video segment around the loud part and create GIF
            // NOTE: This is a basic example, you might need to refine the command or analyze the output more thoroughly
            execSync(`ffmpeg -i "${file}" -vf "fps=10,scale=320:-1:flags=lanczos" -ss 2 -t 4 "${file}.gif"`);
        }
    } catch (err) {
        console.error(`Error processing file: ${file}`, err);
    }
});
