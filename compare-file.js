import crypto from 'crypto';
import fs from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import cliProgress from 'cli-progress';



// Construct the two paths based on the shootID and the given pieces of information
function constructPath(shootID, pathPart) {
    const [date, , time, ...names] = shootID.split('.');
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    return `/Volumes/${pathPart}/${year}_${month}/${day}/${shootID}`;
}

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
    console.log(`dirPath: ${dirPath}`)
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
async function compareFiles(dir1, dir2) {
  const totalFiles = getTotalFiles(dir1);
  console.log(`totalFiles: ${totalFiles}`)
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

  console.log(`${pathPart1} and ${pathPart2} are identical`);
}

export function compareFilesWithArgs(shootID, pathPart1, pathPart2) {
  const dirPath1 = constructPath(shootID, pathPart1);
  const dirPath2 = constructPath(shootID, pathPart2);
  
  console.log(dirPath1);
  console.log(dirPath2);

  compareFiles(dirPath1, dirPath2);
}
