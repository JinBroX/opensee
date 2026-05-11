import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`OpenSee running at http://localhost:${PORT}`);
  console.log(`  opensee.html   → http://localhost:${PORT}/opensee.html`);
  console.log(`  opensee-me.html → http://localhost:${PORT}/opensee-me.html`);
});
