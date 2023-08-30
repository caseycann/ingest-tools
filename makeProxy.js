import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import cliProgress from 'cli-progress';

function compressVideo(videoPath, outputPath) {
    const compressedVideoPath = path.join(outputPath, path.basename(videoPath));
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;
    execSync(ffmpegCommand);
    return compressedVideoPath;
}

function copyToProxyDestination(compressedVideoPath, shootFolderName) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    console.log(`_______________________________________${year}_${month}`);
    const proxyDestination = `/Volumes/sdx.1000/_proxy/${year}_${month}/${shootFolderName}_proxy`;
    
    //________________CHANGE THIS PATH BEFORE USING

    if (!fs.existsSync(proxyDestination)) {
        fs.mkdirSync(proxyDestination, { recursive: true });
    }

    const destinationPath = path.join(proxyDestination, path.basename(compressedVideoPath));
    fs.copyFileSync(compressedVideoPath, destinationPath);
}

function makeProxy(directoryPath) {
    const shootFolderName = path.basename(directoryPath);

    // Calculate the expected proxyDestination
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    const proxyDestination = `/Volumes/sdx.1000/_proxy/${year}_${month}/${shootFolderName}_proxy`;

    // Check if the directory already exists in the proxyDestination path
    if (fs.existsSync(proxyDestination)) {
        throw new Error(`A directory already exists at ${proxyDestination}. Please remove or rename the existing directory before proceeding.`);

    }

    // Create shoot_proxy directory if not present
    const proxyRootDir = path.join(path.dirname(directoryPath), shootFolderName + "_proxy");
    if (!fs.existsSync(proxyRootDir)) {
        fs.mkdirSync(proxyRootDir);
    }

    const cameraDirs = fs.readdirSync(directoryPath).filter(subDir => {
        const subDirPath = path.join(directoryPath, subDir);
        return fs.statSync(subDirPath).isDirectory();
    });

    // Count total number of .mp4 files
    let totalMediaFiles = 0;
    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        const mediaFiles = fs.readdirSync(cameraDirPath).filter(file => file.endsWith('.mp4')); 
        totalMediaFiles += mediaFiles.length;
    });

    // Create a new progress bar instance and start it
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(totalMediaFiles, 0);

    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        
        // Create the corresponding directory in the proxy folder
        const cameraProxyDirPath = path.join(proxyRootDir, cameraDir);
        if (!fs.existsSync(cameraProxyDirPath)) {
            fs.mkdirSync(cameraProxyDirPath);
        }

        const mediaFiles = fs.readdirSync(cameraDirPath).filter(file => file.endsWith('.mp4')); 
        
        mediaFiles.forEach(mediaFile => {
            const mediaFilePath = path.join(cameraDirPath, mediaFile);
            const compressedVideoPath = compressVideo(mediaFilePath, cameraProxyDirPath);
            copyToProxyDestination(compressedVideoPath, shootFolderName);

            // Increment the progress bar for each processed file
            progressBar.increment();
        });
    });

    // Stop the progress bar when done
    progressBar.stop();
    fs.rmdirSync(proxyRootDir, { recursive: true });
    // fs.rm(proxyRootDir, { recursive: true })
    console.log(`${shootFolderName} has been proxied.`)
}

if (process.argv.length < 3) {
    console.error('Please provide the shoot directory path.');
    process.exit(1);
}

export { makeProxy };
