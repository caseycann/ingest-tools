import dotenv from 'dotenv';
dotenv.config();
import { spawnSync } from 'child_process';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import Airtable from 'airtable';


const base = new Airtable(process.env.AIRTABLE_API_KEY).base(process.env.AIRTABLE_BASE_ID);

function pushShoottoAT(directoryPath) {
    const subfolders = readdirSync(directoryPath);
  
    for (const subfolder of subfolders) {
      const subfolderPath = join(directoryPath, subfolder);
      const stats = statSync(subfolderPath);
  
      if (stats.isDirectory()) {
        const data = processFolder(subfolderPath);
        if (data) {
          // Send the data to Airtable
          for (const item of data) {
            // We need to handle video and image data differently
            if (item.format) { // this means it's video data
              const pathParts = item.format.filename.split('/');
              const device = pathParts[pathParts.length - 2]; 
              const shoot = pathParts[pathParts.length - 3]
              const filename = basename(item.format.filename);
              if (shoot.substring(0, 15) !== filename.substring(0, 15)) {
                    throw new Error(`"This shoot has not yet been renamed: ${shoot} vs ${filename}`);
              } else {
                    base(process.env.FFPROBE_DATA_TABLE).create([
                        {
                        "fields": {
                            "filename": basename(item.format.filename),
                            "shoot": shoot,
                            "device": device,
                            "codec_name": item.streams[0].codec_name,
                            "profile": item.streams[0].profile,
                            "codec_type": item.streams[0].codec_type,
                            "width": item.streams[0].width,
                            "height": item.streams[0].height,
                            "pix_fmt": item.streams[0].pix_fmt,
                            "color_space": item.streams[0].color_space,
                            "color_transfer": item.streams[0].color_transfer,
                            "color_primaries": item.streams[0].color_primaries,
                            "time_base": item.streams[0].time_base,
                            "duration_ts": item.streams[0].duration_ts,
                            "duration": parseInt(item.streams[0].duration),
                            "bit_rate": item.streams[0].bit_rate,
                            "bits_per_raw_sample": item.streams[0].bits_per_raw_sample,
                            "creation_time": item.streams[0].tags.creation_time,
                            "timecode": item.streams[0].tags.timecode,
                            "json": JSON.stringify(item, null, 4)
                        }
                        },
          // Add more records as necessary
        ], function(err, records) {
          if (err) {
            console.error(err);
            return;
          }
          records.forEach(function (record) {
            console.log(record.getId());
          });
        });
      }
            } else if (item[0].SourceFile) { // this means it's image data
              const filename = basename(item[0].SourceFile);
              const pathParts = item[0].SourceFile.split('/');
              const device = pathParts[pathParts.length - 2]; 
              const shoot = pathParts[pathParts.length - 3]
              pushImageDataToAT(item[0], shoot);
            }
          }
        }
      }
    }
  }
  

function pushImageDataToAT(exifData, shoot) {
    base(process.env.EXIF_DATA_TABLE).create([
        {
            "fields": {
                "FileName": exifData.FileName,
                "shoot": shoot,
                "FileSize": exifData.FileSize,
                "FileType": exifData.FileType,
                "ImageWidth": exifData.ImageWidth,
                "ImageHeight": exifData.ImageHeight,
                "Make": exifData.Make,
                "Model": exifData.Model,
                "ExposureTime": exifData.ExposureTime,
                "FNumber": exifData.FNumber,
                "ISO": exifData.ISO,
                "FocalLength": exifData.FocalLength,
                "ColorSpace": exifData.ColorSpace,
                "LensModel": exifData.LensModel,
                "json": JSON.stringify(exifData, null, 4)
            }
        },
    ], function(err, records) {
        if (err) {
            console.error(err);
            return;
        }
        records.forEach(function (record) {
            console.log(record.getId());
        });
    });
}


function processFolder(folderPath) {
  const files = readdirSync(folderPath);
  const data = [];

  for (const file of files) {
    const filePath = join(folderPath, file);
    const stats = statSync(filePath);

    if (stats.isFile()) {
      let fileData;

      if (isVideoFile(file)) {
        fileData = processVideoFile(filePath);
      } else if (isImageFile(file)) {
        fileData = processImageFile(filePath);
      }

      if (fileData) {
        data.push(fileData);
      }
    }
  }

  return data;
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

function isImageFile(filename) {
    const imageExtensions = ['.cr2', '.jpg', '.jpeg', '.png', '.tiff', '.dng', '.heif']; // Add more extensions if needed
    const ext = extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
}


// Check if a file has a video extension
function isVideoFile(filename) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v']; // Add more extensions if needed
  const ext = extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
}


export { pushShoottoAT };
