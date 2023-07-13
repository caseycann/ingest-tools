#!/usr/bin/env node

import checkSizes from './compare-file-sizes.js'
import checkChecksum from './compare-file.js'
import pushShoot from './ffprobe-to-AT_shoot.js'
import pushMonth from './ffprobe-to-at_month.js'

const args = process.argv.slice(2);

switch (args[0]) {
  case '--checkSizes':
    checkSizes(args[1], args[2]);
    break;
  case '--checkChecksum':
    checkChecksum(args[1], args[2]);
    break;
  case '--pushShoot':
    pushShoot(args[1]);
    break;
  case '--pushMonth':
    pushMonth(args[1]);
    break;
  default:
    console.error('Invalid script identifier. Use --checkSizes, --checkChecksum, --pushShoot, or --pushMonth.');
    process.exit(1);
}