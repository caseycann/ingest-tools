import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Retrieve the paths from the command line arguments
const [dirPath1, dirPath2] = process.argv.slice(2);

// Function to compute the size of all files in a directory
function getDirSize(dirPath) {
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

// Compare the directory sizes
function compareSizes(dir1, dir2) {
  const dirSize1 = getDirSize(dir1);
  const dirSize2 = getDirSize(dir2);

  if (dirSize1 !== dirSize2) {
    console.log(`Directory sizes are not equal: ${dir1} is ${dirSize1} bytes, ${dir2} is ${dirSize2} bytes`);
    process.exit(1);
  } else {
    console.log('Directory sizes are identical');
  }
}

export { compareSizes }