import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SingleBar, Presets } from 'cli-progress';

function compressVideo(videoPath, shootFolderName, cameraDir, directoryPath) {
    const proxyDestinationBase = getProxyDestinationBase(directoryPath, shootFolderName);
    const destinationDir = path.join(proxyDestinationBase, cameraDir);
    ensureDirectoryExists(destinationDir);
    const compressedVideoPath = path.join(destinationDir, path.basename(videoPath));
    
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;
    execSync(ffmpegCommand);
}

function compressImage(imagePath, shootFolderName, cameraDir, directoryPath) {
    const proxyDestinationBase = getProxyDestinationBase(directoryPath, shootFolderName);
    const destinationDir = path.join(proxyDestinationBase, cameraDir);
    ensureDirectoryExists(destinationDir);
    const compressedImagePath = path.join(destinationDir, path.basename(imagePath, path.extname(imagePath)) + '.jpg');
    
    const ffmpegCommand = `ffmpeg -i "${imagePath}" "${compressedImagePath}"`;
    execSync(ffmpegCommand);
}

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

function copyNonVideoFile(sourcePath, shootFolderName, cameraDir, directoryPath) {
    const proxyDestinationBase = getProxyDestinationBase(directoryPath, shootFolderName);
    const destinationDir = path.join(proxyDestinationBase, cameraDir);
    ensureDirectoryExists(destinationDir);
    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destinationPath);
}

function isVideoFile(file) {
    const videoExtensions = ['.mp4', '.mov', '.m4v'];
    return videoExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function isAllowedNonVideoFile(file) {
    const allowedExtensions = ['.jpg', '.jpeg', '.gif', '.drp', '.aac', '.wav', '.mp3'];
    return allowedExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function needsImageCompression(file) {
    const compressibleImageExtensions = ['.png', '.tiff', '.cr2'];
    return compressibleImageExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function getProxyDestinationBase(directoryPath, shootFolderName) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    const originalBasePath = path.join(directoryPath.split('/').slice(0, 3).join('/'));
    return path.join(originalBasePath, 'temp_proxy', `${year}_${month}_proxy`, `${shootFolderName}.proxy`);
}

function makeArchivalProxy(directoryPath) {
    const omittedFiles = [];
    const shootFolderName = path.basename(directoryPath);

    const proxyDestinationBase = getProxyDestinationBase(directoryPath, shootFolderName);
    if (fs.existsSync(proxyDestinationBase)) {
        throw new Error(`A directory already exists at ${proxyDestinationBase}. Please remove or rename the existing directory before proceeding.`);
    }

    const cameraDirs = fs.readdirSync(directoryPath).filter(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        return fs.statSync(cameraDirPath).isDirectory();
    });

    let totalFiles = 0;
    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        totalFiles += fs.readdirSync(cameraDirPath).length;
    });

    const progressBar = new SingleBar({}, Presets.shades_classic);
    progressBar.start(totalFiles, 0);

    cameraDirs.forEach(cameraDir => {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        const files = fs.readdirSync(cameraDirPath);

        files.forEach(file => {
            const filePath = path.join(cameraDirPath, file);

            if (isVideoFile(file)) {
                compressVideo(filePath, shootFolderName, cameraDir, directoryPath);
            } else if (needsImageCompression(file)) {
                compressImage(filePath, shootFolderName, cameraDir, directoryPath);
            } else if (isAllowedNonVideoFile(file)) {
                copyNonVideoFile(filePath, shootFolderName, cameraDir, directoryPath);
            } else {
                omittedFiles.push(file);
            }

            progressBar.increment();
        });
    });

    progressBar.stop();
    const omittedFilesPath = `${proxyDestinationBase}/omitted_files.txt`;
    fs.writeFileSync(omittedFilesPath, omittedFiles.join('\n'));

    console.log(`${shootFolderName} has been proxied.`)
}

export function makeArchivalProxyWithArgs(directoryPath) {
    if (!directoryPath) {
        console.error('Please provide the shoot directory path.');
        process.exit(1);
    }
    makeArchivalProxy(directoryPath);
}
