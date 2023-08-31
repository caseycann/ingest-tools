#!/usr/bin/env node

import { pushShoottoAT } from './ffprobe-to-AT_shoot.js';
import { compareFilesWithArgs } from './compare-file.js'
import { compareSizesWithArgs } from './compare-file-sizes.js'
import { processMonthFolder } from './ffprobe-to-at_month.js';
import { randomStills } from './randomStills.js'
import { printJSON } from './printJSON.js'
import { makeProxyWithArgs } from './makeProxy.js'

const functions = {
    '--compareFiles': compareFilesWithArgs,
    '--compareSizes': compareSizesWithArgs,
    '--pushShoot': pushShoottoAT,
    // '--pushMonth': processMonthFolder,
    '--randomStills': randomStills,
    '--printJSON': printJSON, 
    '--makeProxy': makeProxyWithArgs
};

// If only 'tools' or no function argument is entered, display the available functions
if (process.argv.length <= 2) {
    console.log("Available functions:");
    for (const funcName in functions) {
        console.log(funcName);
    }
    process.exit(0);  // Exit after printing the list
}

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
