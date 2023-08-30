#!/usr/bin/env node

import { pushShoottoAT } from './ffprobe-to-AT_shoot.js';
import { compareFilesWithArgs } from './compare-file.js'
import { compareSizesWithArgs } from './compare-file-sizes.js'
import { processMonthFolder } from './ffprobe-to-at_month.js';
import { randomStills } from './randomStills.js'
import { printJSON } from './printJSON.js'
import { makeProxy } from './makeProxy.js'

// add some code that reads out the functions if only 'tools' is entered

const functions = {
    '--compareFiles': compareFilesWithArgs,
    '--compareSizes': compareSizesWithArgs,
    '--pushShoot': pushShoottoAT,
    '--pushMonth': processMonthFolder,
    '--randomStills': randomStills,
    '--printJSON': printJSON, 
    '--makeProxy': makeProxy
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
