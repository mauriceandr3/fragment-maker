import type { Plugin } from 'vite';
import { assertSerializedListSize, sanitizeCommunityPresetsList } from '../lib/communityPresetsStore';

/**
 * Serves the same contract as /api/community-presets on Vercel so `npm run dev` can sync presets in-memory.
 */
export function communityPresetsDevPlugin(): Plugin {
    let store = sanitizeCommunityPresetsList([]);

    return {
        name: 'community-presets-mock-api',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const pathOnly = (req.url ?? '').split('?')[0] ?? '';
                if (pathOnly !== '/api/community-presets') {
                    next();
                    return;
                }
                if (req.method === 'GET') {
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Cache-Control', 'no-store');
                    res.end(JSON.stringify({ presets: store, configured: true }));
                    return;
                }
                if (req.method === 'POST') {
                    let body = '';
                    let tooBig = false;
                    req.on('data', (chunk: Buffer | string) => {
                        if (tooBig) return;
                        body += String(chunk);
                        if (body.length > 5_000_000) {
                            tooBig = true;
                            res.statusCode = 413;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'too_large' }));
                        }
                    });
                    req.on('end', () => {
                        if (tooBig) return;
                        try {
                            const json = JSON.parse(body) as { presets?: unknown };
                            store = sanitizeCommunityPresetsList(json.presets);
                            assertSerializedListSize(store);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true, count: store.length, configured: true }));
                        } catch {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'save_failed' }));
                        }
                    });
                    return;
                }
                res.statusCode = 405;
                res.setHeader('Allow', 'GET, POST');
                res.end();
            });
        },
    };
}
