import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jetzlstorfer.org',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  markdown: {
    // Colours come from the --astro-code-* custom properties in global.css.
    shikiConfig: { theme: 'css-variables' },
  },
});
