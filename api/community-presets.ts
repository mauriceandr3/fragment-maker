import { text } from 'node:stream/consumers';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    COMMUNITY_PRESETS_REDIS_KEY,
    assertSerializedListSize,
    sanitizeCommunityPresetsList,
} from '../src/lib/communityPresetsStore';

/**
 * Vercel sets env names; Upstash “Redis” + KV integrations may differ slightly.
 * See: https://vercel.com/changelog/vercel-storage-now-includes-instantly-scalable-upstash
 */
function getRedis(): Redis | null {
    const url =
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.KV_REST_API_URL ||
        process.env.UPSTASH_REDIS_KV_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    try {
        return new Redis({ url, token });
    } catch {
        return null;
    }
}

/**
 * Vercel sometimes leaves `req.body` empty for JSON; read the stream when needed.
 * Avoid reading the stream if `body` is already a parsed object.
 */
async function readJsonBody(req: VercelRequest): Promise<unknown | null> {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return req.body;
    }
    if (typeof req.body === 'string' && req.body.length > 0) {
        try {
            return JSON.parse(req.body) as unknown;
        } catch {
            return null;
        }
    }
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        try {
            return JSON.parse(req.body.toString('utf8')) as unknown;
        } catch {
            return null;
        }
    }
    const method = req.method;
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
        return null;
    }
    try {
        const raw = await text(req);
        if (!raw || !raw.length) {
            return null;
        }
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        const redis = getRedis();
        if (!redis) {
            res.status(200).json({ presets: [], configured: false });
            return;
        }
        try {
            const raw = await redis.get(COMMUNITY_PRESETS_REDIS_KEY);
            if (raw == null || raw === '') {
                res.status(200).json({ presets: [], configured: true });
                return;
            }
            const parsed = JSON.parse(String(raw)) as unknown;
            const presets = sanitizeCommunityPresetsList(parsed);
            res.status(200).json({ presets, configured: true });
        } catch {
            res.status(500).json({ error: 'load_failed' });
        }
        return;
    }

    if (req.method === 'POST') {
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ error: 'not_configured' });
            return;
        }
        const body = (await readJsonBody(req)) as { presets?: unknown } | null;
        if (!body || !('presets' in body)) {
            res.status(400).json({ error: 'invalid_body' });
            return;
        }
        try {
            const presets = sanitizeCommunityPresetsList(body.presets);
            assertSerializedListSize(presets);
            await redis.set(COMMUNITY_PRESETS_REDIS_KEY, JSON.stringify(presets));
            res.status(200).json({ ok: true, count: presets.length, configured: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'save_failed';
            if (message.includes('too large')) {
                res.status(413).json({ error: 'too_large' });
            } else {
                res.status(500).json({ error: 'save_failed' });
            }
        }
        return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
};

export default handler;
