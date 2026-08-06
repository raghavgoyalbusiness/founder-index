import type { APIRoute } from 'astro';
import { entries } from '~/lib/data';

/**
 * The search index, fetched lazily the first time someone opens search.
 * Keys are one letter to keep it small — this ships over the wire on every
 * search interaction, and the whole point of the site is that it's fast.
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      entries.map((e) => ({
        n: e.name,
        w: e.what,
        c: e.category,
        t: e.tags,
        s: e.stageRef.name,
        h: e.href,
        v: Boolean(e.verify),
      }))
    ),
    { headers: { 'content-type': 'application/json; charset=utf-8' } }
  );
