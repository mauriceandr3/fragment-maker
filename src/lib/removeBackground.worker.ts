import { removeBackground } from '@imgly/background-removal';

self.onmessage = async (e: MessageEvent<Blob>) => {
  try {
    const resultBlob = await removeBackground(e.data, {
      output: { format: 'image/png' },
    });
    // Convert to ArrayBuffer for transfer (avoids cloning)
    const buffer = await resultBlob.arrayBuffer();
    (self as unknown as Worker).postMessage({ buffer }, [buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};
