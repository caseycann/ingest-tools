import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SingleBar, Presets } from 'cli-progress';
;

function compressVideo(videoPath, outputPath) {
    const compressedVideoPath = path.join(outputPath, path.basename(videoPath));
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;
    execSync(ffmpegCommand);
    return compressedVideoPath;
}

function compressImage(imagePath, outputPath) {
    const compressedImagePath = path.join(outputPath, path.basename(imagePath, path.extname(imagePath)) + '.jpg');
    const ffmpegCommand = `ffmpeg -i "${imagePath}" "${compressedImagePath}"`;
    execSync(ffmpegCommand);
    return compressedImagePath;
}

function copyToProxyDestination(compressedVideoPath, shootFolderName, originalCameraDir) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    const proxyDestinationBase = `/Volumes/10_01/_proxy/${year}_${month}_proxy/${shootFolderName}.proxy`;

    // Include original camera directory in the destination path to retain the folder structure
    const destinationDir = path.join(proxyDestinationBase, originalCameraDir);

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const destinationPath = path.join(destinationDir, path.basename(compressedVideoPath));
    fs.copyFileSync(compressedVideoPath, destinationPath);
}

// Utility function to check if the file is an allowed non-video file
function isAllowedNonVideoFile(file) {
    const allowedExtensions = ['.jpg', '.jpeg', '.gif', '.drp', '.aac', '.wav', '.mp3'];
    return allowedExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

// Utility function to check if the file is an image that needs compression
function needsImageCompression(file) {
    const compressibleImageExtensions = ['.png', '.tiff', '.cr2'];
    return compressibleImageExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

// Utility function to check if the file is a video
function isVideoFile(file) {
    const videoExtensions = ['.mp4', '.mov', '.m4v'];
    return videoExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function copyNonVideoFile(sourcePath, shootFolderName, originalCameraDir) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    const proxyDestinationBase = `/Volumes/10_01/_proxy/${year}_${month}_proxy/${shootFolderName}.proxy`;

    // Include original camera directory in the destination path to retain the folder structure
    const destinationDir = path.join(proxyDestinationBase, originalCameraDir);

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destinationPath);
}


function makeProxy(directoryPath) {
    const omittedFiles = [];
    const shootFolderName = path.basename(directoryPath);
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    const proxyDestination = `/Volumes/10_01/_proxy/${year}_${month}_proxy/${shootFolderName}_proxy`;

    if (fs.existsSync(proxyDestination)) {
        throw new Error(`A directory already exists at ${proxyDestination}. Please remove or rename the existing directory before proceeding.`);
    }

    const proxyRootDir = path.join(path.dirname(directoryPath), shootFolderName + "_proxy");
    if (!fs.existsSync(proxyRootDir)) {
        fs.mkdirSync(proxyRootDir);
    }

    const cameraDirs = fs.readdirSync(directoryPath).filter(subDir => {
        const subDirPath = path.join(directoryPath, subDir);
        return fs.statSync(subDirPath).isDirectory();
    });

    let totalFiles = 0;
    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        const files = fs.readdirSync(cameraDirPath);
        totalFiles += files.length;
    });
    
    const progressBar = new SingleBar({}, Presets.shades_classic);
    progressBar.start(totalFiles, 0);
    
    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        
        // Create the corresponding directory in the proxy folder
        const cameraProxyDirPath = path.join(proxyRootDir, cameraDir);
        if (!fs.existsSync(cameraProxyDirPath)) {
            fs.mkdirSync(cameraProxyDirPath);
        }
    
        const files = fs.readdirSync(cameraDirPath);
    
        files.forEach(file => {
            const filePath = path.join(cameraDirPath, file);
            
            if (isVideoFile(file)) {
                const compressedVideoPath = compressVideo(filePath, cameraProxyDirPath);
                // Include the camera directory in the copy function to retain folder structure
                copyToProxyDestination(compressedVideoPath, shootFolderName, cameraDir);
            } else if (needsImageCompression(file)) {
                const compressedImagePath = compressImage(filePath, cameraProxyDirPath);
                copyToProxyDestination(compressedImagePath, shootFolderName, cameraDir);
            } else if (isAllowedNonVideoFile(file)) {
                copyNonVideoFile(filePath, shootFolderName, cameraDir);
            } else {
                omittedFiles.push(file);
            }

    
            progressBar.increment();
        });
    });
    

    progressBar.stop();
    const omittedFilesPath = `/Volumes/10_01/_proxy/${year}_${month}_proxy/${shootFolderName}.proxy/omitted_files.txt`;
    fs.writeFileSync(omittedFilesPath, omittedFiles.join('\n'));

    fs.rmdirSync(proxyRootDir, { recursive: true });
    console.log(`${shootFolderName} has been proxied.`)
}

export function makeProxyWithArgs(directoryPath) {
    if (!directoryPath) {
        console.error('Please provide the shoot directory path.');
        process.exit(1);
    }

    makeProxy(directoryPath);
}