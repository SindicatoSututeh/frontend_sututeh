const { injectManifest } = require('workbox-build');

injectManifest({
  swSrc: 'public/sw.js',
  swDest: 'build/sw.js',
  globDirectory: 'build',
  globPatterns: ['**/*.{html,js,css,png,svg,webp,json,woff2}'],
}).then(({ count, size }) => {
  console.log(`📦 Precaching: ${count} archivos (${(size/1024).toFixed(1)} KB)`);
});
