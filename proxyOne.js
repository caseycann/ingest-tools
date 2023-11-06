import { exec } from 'child_process';
import path from 'path';
import cliProgress from 'cli-progress';

// Function to compress a video file using FFmpeg with the provided flags
function proxyOne(videoPath, onComplete) {
  const videoDir = path.dirname(videoPath);
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const compressedVideoPath = path.join(videoDir, `${videoName}-compressed.mp4`);

  const command = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;

  const ffmpegProcess = exec(command);

  ffmpegProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`Video compression complete: ${compressedVideoPath}`);
    } else {
      console.error(`FFmpeg process exited with code ${code}`);
    }
    if (onComplete) onComplete();
  });
}

// Function to process a single video file with a simple progress indicator
function processVideo(videoPath) {
  console.log(`Processing video: ${videoPath}`);

  // Create a new progress bar instance and start it
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(1, 0, {
    video: videoPath,
  });

  // Call proxyOne with the video path and a callback function
  proxyOne(videoPath, () => {
    // Update the progress bar to indicate the process is done
    progressBar.update(1);
    progressBar.stop();
    console.log('Video processing is complete.');
  });
}

// Export the processVideo function
export { processVideo };
