#!/usr/bin/env node

import { pushShoottoAT } from './ffprobe-to-AT_shoot.js';
import { compareFiles } from './compare-file.js'
import { compareSizes } from './compare-file-sizes.js'
import { processMonthFolder } from './ffprobe-to-at_month.js';
import { randomStills } from './randomStills.js'

const functions = {
    '--compareFiles': compareFiles,
    '--compareSizes': compareSizes,
    '--pushShoot': pushShoottoAT,
    '--pushMonth': processMonthFolder,
    '--randomStills': randomStills
};

let currentFunction = null;
const argsForFunctions = {};

// Parse command line arguments
for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
        currentFunction = arg;
        argsForFunctions[arg] = [];
    } else if (currentFunction) {
        argsForFunctions[currentFunction].push(arg);
    }
}

// Check that at least one directory was provided
if (Object.values(argsForFunctions).every(args => args.length === 0)) {
    console.log('Please provide at least one path as an argument.');
    process.exit(1);
}

// Run the appropriate function based on the command line arguments
for (const [functionFlag, functionArgs] of Object.entries(argsForFunctions)) {
    const func = functions[functionFlag];
    if (func) {
        func(...functionArgs);
    } else {
        console.log(`Unknown function flag: ${functionFlag}`);
    }
}
