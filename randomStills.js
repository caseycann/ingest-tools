import { readdirSync, statSync, createReadStream } from 'fs';
import { join, parse, basename } from 'path';
import { spawnSync, execSync } from 'child_process';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();
import Airtable from 'airtable';
import fs from 'fs';


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
                  for (let i = 0; i < 5; i++) {
                      const randomTime = getRandomTime(duration);
                      const startTimecode = getStartTimecode(filePath);
                      const outputFilePath = join(shootFolderPath, `${parse(file).name}_${startTimecode.replace(/:/g, "")}.jpg`);
                      extractStill(filePath, randomTime, outputFilePath);
                      await sendImageToSlack(outputFilePath, process.env.SLACK_CHANNEL);
                      // Send to Airtable if you have that function...
                      
                      // Now, delete the local image
                      try {
                          fs.unlinkSync(outputFilePath);
                          console.log(`Successfully deleted local image: ${outputFilePath}`);
                      } catch (error) {
                          console.error(`Error deleting local image: ${outputFilePath}`, error);
                      }
                  }
              }
          }
      }
  }
}


function getStartTimecode(videoFilePath) {
  try {
    const ffprobeOutput = execSync(
      `ffprobe -v error -select_streams v:0 -print_format json -show_entries stream_tags=timecode "${videoFilePath}"`,
      { encoding: 'utf8' }
    );

    const jsonData = JSON.parse(ffprobeOutput);
    let rawTimecode = jsonData.streams[0].tags.timecode;

    // Format timecode to ensure 8 digits
    return formatTimecode(rawTimecode);

  } catch (error) {
    console.error('Error retrieving timecode:', error);
    return "00:00:00:00";
  }
}

function timecodeToSeconds(timecode) {
  console.log("Converting timecode:", timecode);  // Debugging line
  const [hours, minutes, seconds] = timecode.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function addTimecodes(startTimecode, secondsOffset) {
  console.log("Adding timecode:", startTimecode, "with offset:", secondsOffset);  // Debugging line
  const startInSeconds = timecodeToSeconds(startTimecode);
  const resultInSeconds = startInSeconds + secondsOffset;
  return secondsToTimecode(resultInSeconds);
}

function secondsToTimecode(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // Using `String.prototype.padStart()` to ensure each unit is two digits
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(0).toString().padStart(2, '0')}`;
}

function formatTimecode(timecode) {
  const parts = timecode.split(':');
  while (parts.length < 4) {
      parts.unshift('00');
  }
  return parts.join(':');
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
    'scale=1920:-1',  // This scales the image
    '-q:v', 
    '2', // Adjust this value to change the quality (and therefore size) of the output image
    outputFilePath
  ]);

  if (ffmpegProcess.error) {
    console.error(`Error executing ffmpeg: ${ffmpegProcess.error.message}`);
  }
}

  
async function sendImageToSlack(filePath, channel) {
  try {
      const imageData = fs.readFileSync(filePath);
      const result = await slack.files.uploadV2({
          file: imageData,
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

          // Create a public shared URL for the file
          const sharedPublicURLResult = await slack.files.sharedPublicURL({
              file: file.id
          });

          if (!sharedPublicURLResult.ok) {
              console.error('Error making file public: ', sharedPublicURLResult.error);
              return;
          }

          const filePathURL = makeSlackImageURL(file.permalink, sharedPublicURLResult.file.permalink_public);
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

