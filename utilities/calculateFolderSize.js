import fs from 'fs-extra';
import path from 'path';

export async function calculateFolderSize(folderPath) {
  let totalSize = 0;

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const stats = await fs.lstat(entryPath);

      if (stats.isDirectory()) {
        await walk(entryPath);
      } else if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
  }

  // Start the recursive walk at the root folderPath
  await walk(folderPath);

  // Convert bytes to gigabytes (roughly)
  const sizeInGB = totalSize / (1024 * 1024 * 1024);
  return sizeInGB;
}