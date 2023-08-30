'ffmpeg', [
      '-i', file,
      '-c:v', 'libx264',
    //   `-c:v`, `libx265`,
      '-pix_fmt', 'yuv420p',
    //   `-tag:v`, `hvc1`, 
      `-vf`, `scale=-1:1080`,
      '-preset', 'slow',
      '-crf', (options && options.crfVal) ? options.crfVal : '28',
      '-ac', '2',
      '-c:a', 'aac',
      '-b:a', '128k',
      proxyPath