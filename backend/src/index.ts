import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const port = 3000;

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
      result['files'].push(dirent.name);
    }
  }

  return result;
}

app.get('/media/list', async (req, res) => {
    const mediaPath = process.env.MEDIA_PATH as string;
    const media = await readDirectory(mediaPath);
    res.json(media);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
