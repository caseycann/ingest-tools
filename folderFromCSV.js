import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';

const createDirectory = (destPath, name) => {
    const dirPath = path.join(destPath, name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };
  
  const formatFolderName = (name) => {
    if (!name) {
      console.error('Encountered a row with undefined name');
      return null;
    }
  
    // Extracting the name part and adding the '01_' prefix
    const formattedName = name.split(' - ')[1];
    return `01_${formattedName.replace(/\s+/g, '-')}`;
  };
  
  
  const processCsv = (filePath, destPath) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        const folderName = formatFolderName(row['Title']);
        if (folderName) {
          createDirectory(destPath, folderName);
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
      });
  };
  
  
  // Getting file path and destination path from command line arguments
  const filePath = process.argv[2];
  const destPath = process.argv[3];
  
  // Validate the input arguments
  if (!filePath || !destPath) {
    console.log("Usage: node script.js <path-to-csv-file> <destination-path>");
    process.exit(1);
  }
  
  processCsv(filePath, destPath);
