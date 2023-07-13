import crypto from 'crypto';
import fs from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import cliProgress from 'cli-progress';

// Retrieve the paths from the command line arguments
const [dirPath1, dirPath2] = process.argv.slice(2);

// Create a new progress bar instance
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Function to create checksum for a file
async function getChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
  
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Function to compute checksums for all files in a directory
async function getDirChecksums(dirPath, baseDir = dirPath) {
  const fileNames = readdirSync(dirPath);
  const checksums = {};
  
  for (const fileName of fileNames) {
    const filePath = join(dirPath, fileName);
    const stats = statSync(filePath);
    
    if (stats.isFile()) {
      progressBar.increment();
      const checksum = await getChecksum(filePath);
      const relativePath = relative(baseDir, filePath);
      checksums[relativePath] = checksum;
    } else if (stats.isDirectory()) {
      const subDirChecksums = await getDirChecksums(filePath, baseDir);
      Object.assign(checksums, subDirChecksums);
    }
  }
  
  return checksums;
}

// Function to get total number of files in a directory
function getTotalFiles(dirPath) {
  let total = 0;
  const elements = readdirSync(dirPath);
  for (const element of elements) {
    const elementPath = join(dirPath, element);
    const stats = statSync(elementPath);
    if (stats.isDirectory()) {
      total += getTotalFiles(elementPath);
    } else {
      total++;
    }
  }
  return total;
}

// Compare the checksums
async function compareDirectories(dir1, dir2) {
  const totalFiles = getTotalFiles(dir1);
  progressBar.start(totalFiles, 0);
  
  const checksums1 = await getDirChecksums(dir1);
  const checksums2 = await getDirChecksums(dir2);

  progressBar.stop();

  for (const fileName in checksums1) {
    if (checksums1[fileName] !== checksums2[fileName]) {
      console.log(`Mismatch detected in file ${fileName}`);
      process.exit(1);
    }
  }

  console.log('Directories are identical');
}

compareDirectories(dirPath1, dirPath2);
