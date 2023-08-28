import crypto from 'crypto';
import fs from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import cliProgress from 'cli-progress';
import { execSync } from 'child_process';

const [shootID, pathPart1, pathPart2] = process.argv.slice(3);

function constructPath(shootID, pathPart) {
    const [date, , time, ...names] = shootID.split('.');
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);

    if (pathPart === "aws") {
        return `s3://ll.media.${year}/${year}_${month}/${shootID}`;
    }
    return `/Volumes/${pathPart}/${year}_${month}/${day}/${shootID}`;
}

// Function to get the size of an S3 bucket directory
function getS3DirSize(s3Path) {
    const cmd = `aws s3 ls ${s3Path} --recursive --summarize`;
    const output = execSync(cmd, { encoding: 'utf-8' }); // Execute command synchronously

    // Parse the output to extract total size
    const sizeLine = output.split('\n').find(line => line.includes("Total Size"));
    const sizeValue = sizeLine.split(":")[1].trim().split(" ")[0]; // Assuming the size is in bytes, modify this if it's not the case

    return Number(sizeValue);
}

function getDirSize(dirPath) {
    if (dirPath.startsWith("s3://")) {
        return getS3DirSize(dirPath);
    }

    const fileNames = readdirSync(dirPath);
    let dirSize = 0;

    for (const fileName of fileNames) {
        const filePath = join(dirPath, fileName);
        const stats = statSync(filePath);

        if (stats.isFile()) {
            dirSize += stats.size;
        } else if (stats.isDirectory()) {
            dirSize += getDirSize(filePath);
        }
    }

    return dirSize;
}

// Rest of your code remains unchanged...

// Compare the directory sizes
function compareSizes(dir1, dir2) {
  const dirSize1 = getDirSize(dir1);
  const dirSize2 = getDirSize(dir2);

  if (dirSize1 !== dirSize2) {
    console.log(`Directory sizes are not equal: ${dir1} is ${dirSize1} bytes, ${dir2} is ${dirSize2} bytes`);
    process.exit(1);
  } else {
    console.log(`${shootID} is the same size in ${pathPart1} and ${pathPart2}`);
  }
}

export function compareSizesWithArgs(shootID, pathPart1, pathPart2) {
  const dirPath1 = constructPath(shootID, pathPart1);
  const dirPath2 = constructPath(shootID, pathPart2);
  compareSizes(dirPath1, dirPath2);
}