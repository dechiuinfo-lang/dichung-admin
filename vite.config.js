import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works under a GitHub Pages project subpath
  // (https://<user>.github.io/<repo>/). No router, so relative assets are enough.
  base: './',
});
