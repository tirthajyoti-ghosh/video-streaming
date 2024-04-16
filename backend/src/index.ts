import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env' });

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const port = 3000;

async function generateThumbnail(videoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(videoPath, path.extname(videoPath));
    const thumbnailPath = path.join('thumbnails', `${filename}.thumbnail.jpg`);

    if (fs.existsSync(thumbnailPath)) {
      resolve(thumbnailPath);
      return;
    }

    ffmpeg(videoPath)
      .on('end', () => {
        // --------- Compress the thumbnail after it's generated -----------

        // `sharp` cannot use the same file as both the input and output for the sharp operation. 
        // This is because sharp reads the input file into memory and then writes the output file,
        // and it cannot do both at the same time with the same file.
        // To fix this, write the output to a temporary file and then replace the original file with the temporary file.
        const tempThumbnailPath = path.join(tmpdir(), `${uuidv4()}.jpg`);
        sharp(thumbnailPath)
          .resize(854, 480) // Resize to 854x480 for a 16:9 aspect ratio
          .jpeg({ quality: 75 }) // Reduce quality to 75%
          .toFile(tempThumbnailPath)
          .then(() => fs.promises.rename(tempThumbnailPath, thumbnailPath))
          .then(() => resolve(thumbnailPath))
          .catch(reject);
      })
      .on('error', reject)
      .screenshots({
        timestamps: ['00:00:02'],
        filename: `${filename}.thumbnail.jpg`,
        folder: 'thumbnails',
      });
  });
}

async function readDirectory(dir: string): Promise<any> {
  const result: any = {};

  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const filePath = path.join(dir, dirent.name);

    if (dirent.isDirectory()) {
      const nestedFiles = await readDirectory(filePath);
      result[dirent.name] = nestedFiles[dirent.name] || nestedFiles;
    } else if (dirent.isFile() && !dirent.name.endsWith('.parts')) {
      if (!result['files']) {
        result['files'] = [];
      }

      if (['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'].some(ext => filePath.endsWith(ext))) {
        const thumbnailPath = await generateThumbnail(filePath);
        result['files'].push({ name: dirent.name, thumbnail: thumbnailPath });
      } else {
        result['files'].push({ name: dirent.name });
      }
    }
  }

  return result;
}

app.get('/media/list', async (req, res) => {
    const mediaPath = process.env.MEDIA_PATH as string;
    const media = await readDirectory(mediaPath);
    res.json(media);
});

app.get('/media/thumbnail', (req, res) => {
  const filename = req.query.name as string;
  const filePath = path.resolve(filename);
  res.sendFile(filePath);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
