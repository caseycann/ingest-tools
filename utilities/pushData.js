import dotenv from 'dotenv';
dotenv.config();
import Airtable from 'airtable';
const base = new Airtable(process.env.AIRTABLE_API_KEY).base(process.env.AIRTABLE_BASE_ID);
import { basename } from 'path'

function safeStringify(obj) {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          // Duplicate reference found, discard key
          return;
        }
        // Store value in our set
        cache.add(value);
      }
      return value;
    }, 4);
  }


async function pushVideoDataToAT(videoData, shoot, shootRecordID, device, originalFileName) {
    base(process.env.FFPROBE_DATA_TABLE).create([
        {
          "fields": {
            "filename": basename(videoData.filePath),
            "shoot": shoot,
            "ShootID": [shootRecordID],
            "device": device,
            "codec_name": videoData.streams[0]?.codec_name || "",
            "profile": videoData.streams[0]?.profile || "",
            "codec_type": videoData.streams[0]?.codec_type || "",
            "width": videoData.streams[0].width,
            "height": videoData.streams[0].height,
            "pix_fmt": videoData.streams[0]?.pix_fmt || "",
            "color_space": videoData.streams[0]?.color_space || "",
            "color_transfer": videoData.streams[0]?.color_transfer || "",
            "color_primaries": videoData.streams[0]?.color_primaries || "",
            "time_base": videoData.streams[0]?.time_base || "",
            "duration_ts": videoData.streams[0].duration_ts,
            "duration": parseInt(videoData.streams[0]?.duration) || "",
            "bit_rate": videoData.streams[0]?.bit_rate || "",
            "bits_per_raw_sample": videoData.streams[0]?.bits_per_raw_sample || "",
            "creation_time": videoData.streams[0]?.tags?.creation_time || "",
            "timecode": videoData.streams[0]?.tags?.timecode || "",
            "json": safeStringify(videoData),
            "original_name": originalFileName
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
  
async function pushAudioDataToAT(audioData, shoot, shootRecordID, device, originalFileName) {
    base(process.env.AUDIO_DATA_TABLE).create([
        {
          "fields": {
            "filename": basename(audioData.filePath),
            "shoot": shoot,
            "ShootID": [shootRecordID],
            "device": device,
            "codec_name": audioData.streams[0]?.codec_name || "",
            "profile": audioData.streams[0]?.profile || "",
            "codec_type": audioData.streams[0]?.codec_type || "",
            "width": audioData.streams[0].width,
            "height": audioData.streams[0].height,
            "pix_fmt": audioData.streams[0]?.pix_fmt || "",
            "color_space": audioData.streams[0]?.color_space || "",
            "color_transfer": audioData.streams[0]?.color_transfer || "",
            "color_primaries": audioData.streams[0]?.color_primaries || "",
            "time_base": audioData.streams[0]?.time_base || "",
            "duration_ts": audioData.streams[0]?.duration_ts,
            "duration": parseInt(audioData.streams[0]?.duration) || "",
            "bit_rate": audioData.streams[0]?.bit_rate || "",
            "bits_per_raw_sample": audioData.streams[0]?.bits_per_raw_sample || "",
            "creation_time": audioData.streams[0]?.tags?.creation_time || "",
            "timecode": audioData.streams[0]?.tags?.timecode || "",
            "json": safeStringify(audioData),
            "original_name": originalFileName
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
  
  
  
  
async function pushImageDataToAT(exifData, shoot, shootRecordID, device, originalFileName) {
      base(process.env.EXIF_DATA_TABLE).create([
          {
              "fields": {
                  "FileName": basename(exifData.filePath),
                  "shoot": shoot,
                  "device": device,
                  "ShootID": [shootRecordID],
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
                  "json": safeStringify(exifData),
                  "original_name": originalFileName
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

  export { pushAudioDataToAT, pushVideoDataToAT, pushImageDataToAT }