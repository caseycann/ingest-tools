import dotenv from 'dotenv';
dotenv.config();
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';

// Promisify some callback-based APIs
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configure the AWS SDK
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Function to recursively list all files in a directory
async function getAllFiles(dir) {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
      if (subdir.startsWith('.')) { // Skip hidden files/folders
        return [];
      }
      const res = path.resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getAllFiles(res) : res;
    }));
    return files.reduce((a, f) => a.concat(f), []);
  }
  

async function uploadFileToS3(filePath, baseDirectory, bucketName) {
    const fileContent = fs.readFileSync(filePath);
    
    // Calculate the relative file path from the base directory, not the parent directory
    const relativeFilePath = path.relative(baseDirectory, filePath);
    
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
    
      // Split the filePath by the path separator and get the last part (the filename)
      const parts = filePath.split(path.sep);
      const fileName = parts[parts.length - 1];
    
      // Only apply chalk to the filename
      console.log(`Successfully uploaded and verified ${parts.slice(0, -1).join(path.sep)}${path.sep}${chalk.green(fileName)}`);
}


// Main function to handle the process
async function s3Upload() {
    try {
        let parentDirectory = process.argv[3]; // Assuming the parent directory is the second argument
        const bucketName = process.env.AWS_BUCKET; // Replace with your bucket name

        if (!parentDirectory) {
            throw new Error('Please specify a parent directory.');
        }

        // Normalize the parent directory path
        parentDirectory = path.resolve(parentDirectory);
        
        // Find the base directory dynamically
        const parts = parentDirectory.split(path.sep);
        const footageIndex = parts.indexOf('_footage');
        if (footageIndex === -1) {
            throw new Error('The directory must include a /_footage/ segment.');
        }
        const baseDirectoryParts = parts.slice(0, footageIndex + 1);
        const baseDirectory = baseDirectoryParts.join(path.sep);

        console.log(`Base directory for S3 keys: ${baseDirectory}`);
        console.log(`Parent directory for S3 keys: ${parentDirectory}`);

        const files = await getAllFiles(parentDirectory);

        for (const file of files) {
            await uploadFileToS3(file, baseDirectory, bucketName);
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
