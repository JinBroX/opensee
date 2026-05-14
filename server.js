import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;

// OpenSee 2.1 — layered static serving
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/engine', express.static(path.join(__dirname, 'engine')));
app.use('/semantic', express.static(path.join(__dirname, 'semantic')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/states', express.static(path.join(__dirname, 'states')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`OpenSee 2.1 running at http://localhost:${PORT}`);
  console.log(`  Frontend:  http://localhost:${PORT}/`);
  console.log(`  Engine:    http://localhost:${PORT}/engine/runtime/engine.js`);
  console.log(`  Semantic:  http://localhost:${PORT}/semantic/`);
  console.log(`  Assets:    http://localhost:${PORT}/assets/`);
  console.log(`  States:    http://localhost:${PORT}/states/ (legacy)`);
  console.log(`  Data:      http://localhost:${PORT}/data/ (legacy)`);
});
