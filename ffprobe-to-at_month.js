import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pushShoottoAT } from './ffprobe-to-AT_shoot.js'

function processMonthFolder(monthFolderPath) {
  const days = readdirSync(monthFolderPath);
  for (const day of days) {
    const dayPath = join(monthFolderPath, day);
    if (statSync(dayPath).isDirectory()) {
      const shoots = readdirSync(dayPath);
      for (const shoot of shoots) {
        const shootPath = join(dayPath, shoot);
        if (statSync(shootPath).isDirectory()) {
          pushShoottoAT(shootPath);
        }
      }
    }
  }
}

export { processMonthFolder };
