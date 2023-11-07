import { exec } from 'child_process';
import path from 'path';
import chalk from 'chalk'; // Import the chalk package

// Function to compress a video file using FFmpeg with the provided flags
function proxyOne(videoPath, onComplete) {
  const videoDir = path.dirname(videoPath);
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const compressedVideoPath = path.join(videoDir, `${videoName}-compressed.mp4`);

  const command = `ffmpeg -i "${videoPath}" -vf scale=1920:-1 -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 "${compressedVideoPath}"`;

  const ffmpegProcess = exec(command);

  ffmpegProcess.on('close', (code) => {
    if (code === 0) {
      // Use chalk to style the completion message
      console.log(chalk.green.bold(`Video compression complete: ${compressedVideoPath}`));
    } else {
      // Use chalk to style the error message
      console.error(chalk.red.bold(`FFmpeg process exited with code ${code}`));
    }
    if (onComplete) onComplete();
  });
}

// Export the proxyOne function
export { proxyOne };
