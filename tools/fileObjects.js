// const getDirsInDir = require('./tools/elements/get-dirs-in-dir.js')
// const getFilesInDirs = require('./tools/elements/get-files-in-dirs.js')

// import getDirsInDir from './elements/get-dirs-in-dir.js';
// import getFilesInDirs from './elements/get-files-in-dirs.js';

const getDirFiles = async function (dirPath, shootId) {
    console.log(`getting the paths in ${dirPath}`);
    const fileObjects = []
    const filesInDir = fs.readdirSync(dirPath);
    for (let i = 0; i < filesInDir.length; i++) {
        const element = filesInDir[i];
        const counter = i+1;
        if (element!==".DS_Store" && !fs.statSync(path.join(dirPath, element)).isDirectory()) {
            let extension = path.extname(path.join(dirPath, element));
            let theCounter = 1+i
            fileObjects.push(
                {
                    oldPath: path.join(dirPath, element),
                    newPath: path.join(dirPath, `${shootId}_${path.basename(dirPath)}.${('0000'+theCounter).slice(-4)}${extension}`)
                }
            );
        }
        // else handle subfolders in the wrong place and wrong files
    }
    return fileObjects;
}
module.exports = fileObjects;

