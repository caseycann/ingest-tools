import dotenv from 'dotenv';
dotenv.config();
import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Promisify some callback-based APIs
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configure the AWS SDK
AWS.config.update({ region: process.env.AWS_REGION }); // Specify your region

const s3 = new AWS.S3();

// Function to determine if the path is a "month" or "shoot" directory
function determineDirectoryType(directory) {
    // Trim whitespace from directory name
    const dirName = path.basename(directory).trim();
  
    const monthRegex = /^\d{4}_\d{2}$/;
    const shootRegex = /^\d{8}\.\d{2}\.\d{4}_\w+$/;
  
    if (monthRegex.test(dirName)) {
      return 'month';
    } else if (shootRegex.test(dirName)) {
      return 'shoot';
    } else {
      throw new Error('Invalid directory type. The directory does not match the expected patterns.');
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

// Function to upload a file to S3 and compare sizes
async function uploadFileToS3(filePath, bucketName) {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: bucketName,
    Key: path.basename(filePath), // TODO: Adjust key as needed for your bucket structure
    Body: fileContent
  };

  const uploadResult = await s3.upload(params).promise();

  // Check if the file size matches
  const s3HeadParams = {
    Bucket: bucketName,
    Key: path.basename(filePath)
  };
  const { ContentLength } = await s3.headObject(s3HeadParams).promise();
  const localFileSize = fs.statSync(filePath).size;

  if (ContentLength !== localFileSize) {
    throw new Error(`File size mismatch for ${filePath}: local size ${localFileSize}, S3 size ${ContentLength}`);
  }

  console.log(`Successfully uploaded and verified ${filePath}`);
}

// Main function to handle the process
async function s3Upload() {
  try {
    const directory = process.argv[2];
    const bucketName = process.env.AWS_BUCKET; // Replace with your bucket name

    if (!directory) {
      throw new Error('Please specify a directory.');
    }

    const directoryType = determineDirectoryType(directory);
    console.log(`Processing as a "${directoryType}" directory`);

    const files = await getAllFiles(directory);

    for (const file of files) {
      await uploadFileToS3(file, bucketName);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
export { s3Upload }
