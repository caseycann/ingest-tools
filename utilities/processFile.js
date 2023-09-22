import { spawnSync } from 'child_process';


function processAudioFile(audioFilePath) {
    // This will be very similar to processVideoFile since we are using FFPROBE
    const ffprobeProcess = spawnSync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        audioFilePath
    ]);
      
    if (ffprobeProcess.error) {
      console.error(`Error executing ffprobe: ${ffprobeProcess.error.message}`);
      return;
    }
  
    if (ffprobeProcess.status !== 0) {
      console.error(`ffprobe process exited with code ${ffprobeProcess.status}`);
      return;
    }
  
    try {
      const ffprobeOutput = ffprobeProcess.stdout.toString();
      const ffprobeData = JSON.parse(ffprobeOutput);
      return ffprobeData;
    } catch (parseError) {
      console.error(`Error parsing ffprobe output: ${parseError}`);
    }
  }
  
  
  // Process a single image file
  function processImageFile(imageFilePath) {
      const exiftoolProcess = spawnSync('exiftool', [
        '-json', // This argument instructs exiftool to output in JSON format
        imageFilePath
      ]);
      
      if (exiftoolProcess.error) {
        console.error(`Error executing exiftool: ${exiftoolProcess.error.message}`);
        return;
      }
      
      if (exiftoolProcess.status !== 0) {
        console.error(`exiftool process exited with code ${exiftoolProcess.status}`);
        return;
      }
      
      try {
        const exiftoolOutput = exiftoolProcess.stdout.toString();
        const exiftoolData = JSON.parse(exiftoolOutput);
      //   console.log(exiftoolData); // Add a log here to inspect the output
        return exiftoolData;
      } catch (parseError) {
        console.error(`Error parsing exiftool output: ${parseError}`);
      }
    }
    
  // Process a single video file
  function processVideoFile(videoFilePath) {
      const ffprobeProcess = spawnSync('ffprobe', [
          '-v',
          'quiet',
          '-print_format',
          'json',
          '-show_format',
          '-show_streams',
          videoFilePath
        ]);
      
        if (ffprobeProcess.error) {
          console.error(`Error executing ffprobe: ${ffprobeProcess.error.message}`);
          return;
        }
      
        if (ffprobeProcess.status !== 0) {
          console.error(`ffprobe process exited with code ${ffprobeProcess.status}`);
          return;
        }
      
        try {
          const ffprobeOutput = ffprobeProcess.stdout.toString();
          const ffprobeData = JSON.parse(ffprobeOutput);
          // console.log(ffprobeData);
          return ffprobeData;
        } catch (parseError) {
          console.error(`Error parsing ffprobe output: ${parseError}`);
        }
          try {
      const ffprobeOutput = ffprobeProcess.stdout.toString();
      const ffprobeData = JSON.parse(ffprobeOutput);
      // console.log(ffprobeData); // Add a log here to inspect the output
      return ffprobeData;
    } catch (parseError) {
      console.error(`Error parsing ffprobe output: ${parseError}`);
    }
  }

  export { processAudioFile, processImageFile, processVideoFile }