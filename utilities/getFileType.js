import path from 'path';

function getFileType(filename) {
    const imageExtensions = ['.cr2', '.jpg', '.jpeg', '.png', '.tiff', '.dng', '.heif'];
    const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.aiff'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v'];

    const ext = path.extname(filename).toLowerCase();

    if (imageExtensions.includes(ext)) {
        return 'image';
    } else if (audioExtensions.includes(ext)) {
        return 'audio';
    } else if (videoExtensions.includes(ext)) {
        return 'video';
    } else {
        return 'unknown';
    }
}

export default getFileType