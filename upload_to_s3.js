import dotenv from 'dotenv';
dotenv.config();
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Promisify some callback-based APIs
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configure the AWS SDK
const s3 = new S3Client({ region: process.env.AWS_REGION });

function findRootPath(directory) {
    let parts = directory.split(path.sep);
    console.log(`Original directory parts: ${parts.join(', ')}`); // Add logging to see the path parts
    for (let i = parts.length - 1; i >= 0; i--) {
        const partPath = parts.slice(0, i + 1).join(path.sep);
        const type = determineDirectoryType(partPath);
        console.log(`Checking path: ${partPath} - Type: ${type}`); // Log each part checked and its type
        if (type !== 'invalid') {
            return partPath;
        }
    }
    console.log('No valid root path found, defaulting to provided directory'); // Log when defaulting
    return directory; // Fallback to the given directory if no specific type is found
}

// Function to determine if the path is a "month" or "shoot" directory
function determineDirectoryType(directory) {
    // Ensure no trailing slash interferes with the basename
    const normalizedDir = directory.endsWith('/') ? directory.slice(0, -1) : directory;

    // Trim whitespace from directory name
    const dirName = path.basename(normalizedDir).trim();

    // Check if it's a "month" folder by length and underscore position
    if (dirName.length === 7 && dirName.charAt(4) === '_') {
        console.log('Identified as a month directory');
        return 'month';
    }
    // Check if it's a "shoot" folder by pattern (starts with a date)
    else if (/^\d{8}.\d{2}.\d{4}/.test(dirName)) {
        console.log('Identified as a shoot directory');
        return 'shoot';
    } else {
        console.log('Failed to identify the directory type');
        return 'invalid'; // Changed from throwing an error to returning 'invalid'
    }
}



// Function to recursively list all files in a directory
async function getAllFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = path.resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getAllFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

async function uploadFileToS3(filePath, rootDirectory, bucketName) {
    const fileContent = fs.readFileSync(filePath);
    
    // Calculate the relative file path
    const relativeFilePath = path.relative(rootDirectory, filePath);
    
    // Use the relative file path as the key, replacing backslashes with forward slashes if on Windows
    const key = relativeFilePath.split(path.sep).join('/');
    
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
    };
  
    const command = new PutObjectCommand(params);
    await s3.send(command);
  
    // Check if the file size matches
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    const { ContentLength } = await s3.send(headCommand);
    const localFileSize = fs.statSync(filePath).size;
  
    if (ContentLength !== localFileSize) {
      throw new Error(`File size mismatch for ${filePath}: local size ${localFileSize}, S3 size ${ContentLength}`);
    }
  
    console.log(`Successfully uploaded and verified ${filePath}`);
  }
  

// Main function to handle the process
async function s3Upload() {
    try {
      let directory = process.argv[3];
      const bucketName = process.env.AWS_BUCKET; // Replace with your bucket name
  
      if (!directory) {
        throw new Error('Please specify a directory.');
      }
  
      // Normalize the directory path
      directory = path.resolve(directory);
  
      const rootPath = findRootPath(directory);
      console.log(`Root path for S3 keys: ${rootPath}`);
  
      const files = await getAllFiles(directory);
  
      for (const file of files) {
        await uploadFileToS3(file, rootPath, bucketName);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } 

// At the bottom of your script
const runDirectly = process.argv.includes('--run');

if (runDirectly) {
    s3Upload().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}


export { s3Upload }