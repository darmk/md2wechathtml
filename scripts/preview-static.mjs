import { fileURLToPath } from 'node:url';
import { startStaticServer } from './static-files.mjs';

const preview = await startStaticServer(fileURLToPath(new URL('../dist/client/', import.meta.url)), Number(process.env.PORT || 3000));
console.log(`Static preview: ${preview.url}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await preview.close();
});
