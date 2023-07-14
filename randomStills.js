import { readdirSync, statSync, createReadStream } from 'fs';
import { join, parse, basename } from 'path';
import { spawnSync } from 'child_process';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();

const slack = new WebClient(process.env.SLACK_TOKEN);


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
            for (let i = 0; i < 10; i++) {
              const randomTime = getRandomTime(duration);
              const timestamp = new Date(randomTime * 1000).toISOString().substr(11, 8);
              const timestampForFileName = timestamp.replace(/:/g, ""); // Replace colons with underscore
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
      '-q:v', 
      '15', // Adjust this value to change the quality (and therefore size) of the output image
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
            channels: channel,
            initial_comment: `Here's an image extracted from a video: ${basename(filePath)}`
          });
          
      console.log('File sent: ', result.file.id);
    } catch (error) {
      console.error('Error sending file: ', error);
    }
  }
  
  
  

export { randomStills };
