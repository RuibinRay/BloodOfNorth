import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only: POST /__shot?name=foo with a data URL body saves a playtest screenshot to .playtest/ (or SHOT_DIR).
const shots = () => ({
  name: 'playtest-shots',
  configureServer(server) {
    const dir = process.env.SHOT_DIR || path.resolve('.playtest');
    server.middlewares.use('/__shot', (req, res) => {
      const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '');
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, name + '.jpg'), Buffer.from(body.split(',')[1] || '', 'base64'));
        res.end('ok');
      });
    });
  },
});

export default defineConfig({
  base: './',
  plugins: [shots()],
  server: { host: '127.0.0.1' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
