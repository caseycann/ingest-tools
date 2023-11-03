import sharp from 'sharp';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const pageSize = [3300, 5100];

const extractImage = (videoPath, everyNFrames = 10) => {
    return new Promise((resolve, reject) => {
        const videoFilename = path.parse(videoPath).name;
        const outputPath = path.join(path.dirname(videoPath), videoFilename); // Use video directory as output

        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath);
        }

        const cmd = `ffmpeg -i "${videoPath}" -vf "select=not(mod(n\\,${everyNFrames})),scale=450:-1" -vsync vfr "${path.join(outputPath, 'frame_%05d.png')}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(new Error('Error extracting frames: ' + error.message));
                return;
            }
            console.log('Frames extracted successfully!');
            resolve(outputPath);
        });
    });
};


const createPrintablePage = async (images, outputPath, startingIndex = 0) => {
    const [pageWidth, pageHeight] = pageSize;
    const { height } = await sharp(images[0]).metadata();
    const imgWidth = 450;
    const imgHeight = height;
    const imagesPerColumn = Math.floor(pageHeight / imgHeight);
    const maxColumns = Math.floor(pageWidth / imgWidth);

    const columns = [];
    let currentImageIndex = startingIndex;

    while (currentImageIndex < images.length && columns.length < maxColumns) {
        const columnImages = images.slice(currentImageIndex, currentImageIndex + imagesPerColumn);
        currentImageIndex += imagesPerColumn;

        const overlays = columnImages.map((img, idx) => ({ input: img, top: idx * imgHeight, left: 0 }));

        const columnImage = await sharp({
            create: { width: imgWidth, height: pageHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
        })
        .composite(overlays)
        .png()
        .toBuffer();

        columns.push(columnImage);
    }

    const finalOverlays = columns.map((col, idx) => ({ input: col, top: 0, left: idx * imgWidth }));

    await sharp({
        create: { width: pageWidth, height: pageHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
    .composite(finalOverlays)
    .toFile(outputPath);

    console.log('Image created successfully!');

    return { moreImages: currentImageIndex < images.length, nextIndex: currentImageIndex };
};

const filmStrip = async (videoPath, everyNFrames = 2) => {
    try {
        const outputPath = await extractImage(videoPath, everyNFrames);
        const images = fs.readdirSync(outputPath).map(filename => path.join(outputPath, filename));
        
        const videoFilename = path.parse(videoPath).name;

        let pageIndex = 1;
        let currentImageIndex = 0;
        let moreImages = true;

        while (moreImages) {
            const pageImagePath = path.join(path.dirname(videoPath), `${videoFilename}_filmStrip_page${pageIndex}.png`);
            const result = await createPrintablePage(images, pageImagePath, currentImageIndex);

            moreImages = result.moreImages;
            currentImageIndex = result.nextIndex;
            pageIndex += 1;
        }
        
        console.log('All images processed successfully!');
    } catch (err) {
        console.error(err);
    }
};


export { extractImage, createPrintablePage, filmStrip };
