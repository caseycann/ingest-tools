import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function compressVideo(videoPath, outputPath) {
    const compressedVideoPath = path.join(outputPath, path.basename(videoPath).replace('.mp4', '_proxy.mp4'));
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;
    execSync(ffmpegCommand);
    return compressedVideoPath;
}

function copyToProxyDestination(compressedVideoPath, shootFolderName) {
    const [year, month] = shootFolderName.split('.').slice(0, 2);
    const proxyDestination = `/Volumes/sdx.1000/_proxy${year}_${month}_proxy`;
    
    if (!fs.existsSync(proxyDestination)) {
        fs.mkdirSync(proxyDestination, { recursive: true });
    }

    const destinationPath = path.join(proxyDestination, path.basename(compressedVideoPath));
    fs.copyFileSync(compressedVideoPath, destinationPath);
}

function makeProxy(directoryPath) {
    const shootFolderName = path.basename(directoryPath);
    
    // Create shoot_proxy directory if not present
    const proxyRootDir = path.join(path.dirname(directoryPath), shootFolderName + "_proxy");
    if (!fs.existsSync(proxyRootDir)) {
        fs.mkdirSync(proxyRootDir);
    }

    const cameraDirs = fs.readdirSync(directoryPath).filter(subDir => {
        const subDirPath = path.join(directoryPath, subDir);
        return fs.statSync(subDirPath).isDirectory();
    });

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
        });
    });
}

if (process.argv.length < 3) {
    console.error('Please provide the shoot directory path.');
    process.exit(1);
}

export { makeProxy };
