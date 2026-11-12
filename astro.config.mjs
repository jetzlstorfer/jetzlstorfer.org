import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jetzlstorfer.org',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
