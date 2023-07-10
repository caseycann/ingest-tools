#!/usr/bin/env node

// bring in all the tools needed for text display
// var figlet = require('figlet');
// var clear = require('clear');
// var chalk = require('chalk');
// const mk = require('./tools/mk/index')
// const rename = require('./tools/ingest/rename')
// const fileObjects = require('./tools/fileObjects.js')
// const { secs2hms, secs2tc } = require('./tools/utilities/ll-time-tools')


import chalk from 'chalk';
import figlet from 'figlet';
import clear from 'clear';
// import mk from './tools/mk/index';
import rename from './tools/rename.js';
import fileObjects from './tools/fileObjects.js'

require('dotenv').config();

// const m2s = require('./tools/m2s/index.js')
// const makeFolders = require('./tools/ingest/make-folders')
// store any arguments passed in using yargs
var yargs = require('yargs').argv;

console.log("launching it.")

if (yargs.mk) {
    mk(yargs)
} else if (yargs.rename) {
    rename(yargs.rename)
} else if (yargs.fileObjects){
    fileObjects(yargs.fileObjects)
} else {
    console.log(`sorry, you didn't enter a recognized command.`)
}