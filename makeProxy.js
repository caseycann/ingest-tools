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
    const baseNameWithoutExt = path.basename(imagePath, path.extname(imagePath)); 
    const compressedImagePath = path.join(outputPath, baseNameWithoutExt + '.jpg');

    // Use the magick command to convert the image
    const convertCommand = `magick "${imagePath}" -quality 85 "${compressedImagePath}"`;

    try {
        console.log(`Converting and compressing image: ${imagePath} to ${compressedImagePath}`);
        await runCommand(convertCommand);
        return compressedImagePath;
    } catch (error) {
        console.error(`Failed to convert and compress image: ${imagePath}. Error: ${error.message}`);
        return null;
    }
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

async function copyToProxyDestination(compressedFilePath, originalCameraDir, shootFolderDir) {
    // Use the input directory as the destination for the compressed files
    const destinationDir = path.join(shootFolderDir, originalCameraDir); // Saving into the same directory as the source
    await fs.mkdir(destinationDir, { recursive: true });

    const destinationPath = path.join(destinationDir, path.basename(compressedFilePath));
    await fs.copyFile(compressedFilePath, destinationPath);
}

function isAllowedNonVideoFile(file) {
    const allowedExtensions = ['.jpg', '.jpeg', '.gif', '.drp'];
    return allowedExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function needsImageCompression(file) {
    const compressibleImageExtensions = ['.png', '.tiff', '.cr2', '.CR2'];
    return compressibleImageExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

function isVideoFile(file) {
    const videoExtensions = ['.mp4', '.mov', '.m4v'];
    return videoExtensions.some(ext => file.toLowerCase().endsWith(ext));
}

async function copyNonVideoFile(sourcePath, originalCameraDir, shootFolderDir) {
    const destinationDir = path.join(shootFolderDir, originalCameraDir);
    await fs.mkdir(destinationDir, { recursive: true });

    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    await fs.copyFile(sourcePath, destinationPath);
}

async function makeProxy(directoryPath) {
    const omittedFiles = [];
    const shootFolderName = path.basename(directoryPath);
    
    // Create the proxyRootDir at the same level as the shootFolder, not inside it
    const proxyRootDir = path.join(path.dirname(directoryPath), shootFolderName + ".proxy");

    try {
        await fs.access(proxyRootDir);
        throw new Error(`A directory already exists at ${proxyRootDir}. Please remove or rename the existing directory before proceeding.`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    // Proceed with creating the proxyRootDir
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
                if (compressedVideoPath) {
                    await copyToProxyDestination(compressedVideoPath, cameraDir, proxyRootDir);
                }
            } else if (needsImageCompression(file)) {
                const compressedImagePath = await compressImage(filePath, cameraProxyDirPath);
                if (compressedImagePath) {
                    await copyToProxyDestination(compressedImagePath, cameraDir, proxyRootDir);
                }
            } else if (isAllowedNonVideoFile(file)) {
                await copyNonVideoFile(filePath, cameraDir, proxyRootDir);
            } else {
                omittedFiles.push(file);
            }
        
            progressBar.increment();
        }
        
    }

    progressBar.stop();
    const omittedFilesPath = path.join(proxyRootDir, 'omitted_files.txt');
    await fs.writeFile(omittedFilesPath, omittedFiles.join('\n'));
    
    // Remove this line, so we don't delete the generated folders and contents
    // await fs.rmdir(proxyRootDir, { recursive: true });

    console.log(`${shootFolderName} has been proxied to ${proxyRootDir}.`);
}

export async function makeProxyWithArgs(directoryPath) {
    if (!directoryPath) {
        console.error('Please provide the shoot directory path.');
        return;
    }

    await makeProxy(directoryPath);
}
