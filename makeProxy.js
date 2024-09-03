import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { SingleBar, Presets } from 'cli-progress';

// const execAsync = promisify(exec);

async function compressVideo(videoPath, outputPath) {
    const compressedVideoPath = path.join(outputPath, path.basename(videoPath));
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;
    await runCommand(ffmpegCommand);
    return compressedVideoPath;
}

async function compressImage(imagePath, outputPath) {
    const compressedImagePath = path.join(outputPath, path.basename(imagePath, path.extname(imagePath)) + '.jpg');
    const ffmpegCommand = `ffmpeg -i "${imagePath}" "${compressedImagePath}"`;
    await runCommand(ffmpegCommand);
    return compressedImagePath;
}

async function runCommand(command) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, { shell: true });

        process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function copyToProxyDestination(compressedFilePath, shootFolderName, originalCameraDir) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    // const proxyDestinationBase = '/Users/ll-studio/Desktop/_test-proxy';
    const proxyDestinationBase = `/Volumes/10_01/_proxy/${year}_${month}_Proxy/${shootFolderName}.proxy`;

    const destinationDir = path.join(proxyDestinationBase, originalCameraDir);
    await fs.mkdir(destinationDir, { recursive: true });

    const destinationPath = path.join(destinationDir, path.basename(compressedFilePath));
    await fs.copyFile(compressedFilePath, destinationPath);
}

function isAllowedNonVideoFile(file) {
    const allowedExtensions = ['.jpg', '.jpeg', '.gif', '.drp'];
    return allowedExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function needsImageCompression(file) {
    const compressibleImageExtensions = ['.png', '.tiff', '.cr2'];
    return compressibleImageExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function isVideoFile(file) {
    const videoExtensions = ['.mp4', '.mov', '.m4v'];
    return videoExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

async function copyNonVideoFile(sourcePath, shootFolderName, originalCameraDir) {
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    // const proxyDestinationBase = '/Users/ll-studio/Desktop/_test-proxy';
    const proxyDestinationBase = `/Volumes/10_01/_proxy/${year}_${month}_Proxy/${shootFolderName}_proxy`;

    const destinationDir = path.join(proxyDestinationBase, originalCameraDir);
    await fs.mkdir(destinationDir, { recursive: true });

    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    await fs.copyFile(sourcePath, destinationPath);
}

async function makeProxy(directoryPath) {
    const omittedFiles = [];
    const shootFolderName = path.basename(directoryPath);
    const year = shootFolderName.slice(0, 4);
    const month = shootFolderName.slice(4, 6);
    // const proxyDestination = '/Users/ll-studio/Desktop/_test-proxy';
    const proxyDestination = `/Volumes/10_01/_proxy/${year}_${month}_Proxy/${shootFolderName}_proxy`;

    // Check if the proxyRootDir already exists
    const proxyRootDir = path.join(path.dirname(directoryPath), shootFolderName + "_proxy");

    try {
        await fs.access(proxyRootDir);
        throw new Error(`A directory already exists at ${proxyRootDir}. Please remove or rename the existing directory before proceeding.`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    // Proceed with creating the proxyRootDir since it does not exist
    await fs.mkdir(proxyRootDir, { recursive: true });

    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const cameraDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    let totalFiles = 0;
    for (const cameraDir of cameraDirs) {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        const files = await fs.readdir(cameraDirPath);
        totalFiles += files.length;
    }

    const progressBar = new SingleBar({}, Presets.shades_classic);
    progressBar.start(totalFiles, 0);

    for (const cameraDir of cameraDirs) {
        const cameraDirPath = path.join(directoryPath, cameraDir);
        const cameraProxyDirPath = path.join(proxyRootDir, cameraDir);  // Save in the same directory as the source

        await fs.mkdir(cameraProxyDirPath, { recursive: true });

        const files = await fs.readdir(cameraDirPath);

        for (const file of files) {
            const filePath = path.join(cameraDirPath, file);

            if (isVideoFile(file)) {
                const compressedVideoPath = await compressVideo(filePath, cameraProxyDirPath);
                await copyToProxyDestination(compressedVideoPath, shootFolderName, cameraDir);  // Copy to proxyDestination after compression
            } else if (needsImageCompression(file)) {
                const compressedImagePath = await compressImage(filePath, cameraProxyDirPath);
                await copyToProxyDestination(compressedImagePath, shootFolderName, cameraDir);  // Copy to proxyDestination after compression
            } else if (isAllowedNonVideoFile(file)) {
                await copyNonVideoFile(filePath, shootFolderName, cameraDir);
            } else {
                omittedFiles.push(file);
            }

            progressBar.increment();
        }
    }

    progressBar.stop();
    const omittedFilesPath = path.join(proxyRootDir, 'omitted_files.txt');
    await fs.writeFile(omittedFilesPath, omittedFiles.join('\n'));
    await fs.rmdir(proxyRootDir, { recursive: true });
    console.log(`${shootFolderName} has been proxied.`);
}


export async function makeProxyWithArgs(directoryPath) {
    if (!directoryPath) {
        console.error('Please provide the shoot directory path.');
        return;
    }

    await makeProxy(directoryPath);
}
