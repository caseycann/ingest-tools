import { readdirSync, statSync, createReadStream } from 'fs';
import { join, parse, basename } from 'path';
import { spawnSync } from 'child_process';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();
import Airtable from 'airtable';

const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE_ID);
const slack = new WebClient(process.env.SLACK_USER_TOKEN);


async function randomStills(shootFolderPath) {
    const cameras = readdirSync(shootFolderPath);
    for (const camera of cameras) {
      const cameraPath = join(shootFolderPath, camera);
      if (statSync(cameraPath).isDirectory()) {
        const files = readdirSync(cameraPath);
        for (const file of files) {
          const filePath = join(cameraPath, file);
          if (statSync(filePath).isFile() && isVideoFile(file)) {
            const duration = getVideoDuration(filePath);
            for (let i = 0; i < 1; i++) {
              const randomTime = getRandomTime(duration);
              const timestamp = new Date(randomTime * 1000).toISOString().substr(11, 8);
              const timestampForFileName = timestamp.replace(/:/, ""); // Replace colons with underscore
              const outputFilePath = join(shootFolderPath, `${parse(file).name}_${timestampForFileName}.jpg`);
              extractStill(filePath, randomTime, outputFilePath);
              await sendImageToSlack(outputFilePath, process.env.SLACK_CHANNEL);
            }
          }
        }
      }
    }
  }
  

function isVideoFile(filename) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.includes(parse(filename).ext.toLowerCase());
}

function getVideoDuration(videoFilePath) {
  const ffprobeOutput = spawnSync('ffprobe', [
    '-v', 'quiet', '-print_format', 'json', '-show_entries', 'format=duration', videoFilePath
  ]).stdout.toString();
  // console.log(ffprobeOutput);

  return JSON.parse(ffprobeOutput).format.duration;
}

function getRandomTime(duration) {
  return Math.floor(Math.random() * duration);
}

function extractStill(videoFilePath, timestamp, outputFilePath) {
  const ffmpegProcess = spawnSync('ffmpeg', [
    '-ss',
    timestamp,
    '-i',
    videoFilePath,
    '-vframes',
    '1',
    '-vf', 
    'scale=1280:-1',  // This scales the image
    '-q:v', 
    '17', // Adjust this value to change the quality (and therefore size) of the output image
    outputFilePath
  ]);

  if (ffmpegProcess.error) {
    console.error(`Error executing ffmpeg: ${ffmpegProcess.error.message}`);
  }
}

  
async function sendImageToSlack(filePath, channel) {
  try {
      const result = await slack.files.uploadV2({
          file: createReadStream(filePath),
          filename: basename(filePath),
          channel_id: channel,
          initial_comment: `${basename(filePath)}`
      });

      // Check if the returned result has the expected structure.
      if (result && result.files && result.files[0] && result.files[0].file) {
          const file = result.files[0].file;
          console.log('File sent: ', file.id);

          function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
          }

          await sleep(3000); // wait for 3 seconds

          const filePathURL = makeSlackImageURL(file.permalink, file.permalink_public);
          console.log('Public URL: ', filePathURL);
          await sendImageToAirtable(basename(filePath), filePathURL);

          // Return the file information for further processing
          return file;
      }
  } catch (error) {
      console.error('Error sending file: ', error);
  }
}

  
  
async function sendImageToAirtable(filename, publicUrl) {
  const table = base(process.env.RANDOMSTILLS_TABLE);  
  try {
      const record = await table.create({
          'name': filename,
          'public_url': publicUrl,
          // Add more fields if needed
      });

      console.log('Record added to Airtable:', record.id);
      return record;
  } catch (error) {
      console.error('Error sending image to Airtable:', error);
  }
}

function makeSlackImageURL (permalink, permalink_public) {
  let secrets = (permalink_public.split("slack-files.com/")[1]).split("-")
  let suffix = permalink.split("/")[(permalink.split("/").length - 1)]
  let filePath = `https://files.slack.com/files-pri/${secrets[0]}-${secrets[1]}/${suffix}?pub_secret=${secrets[2]}`
  return filePath
}


  
export { randomStills };

