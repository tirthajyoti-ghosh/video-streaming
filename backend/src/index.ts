import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const port = 3000;

app.get('/', async (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
