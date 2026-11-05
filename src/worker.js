// Worker: API de cuentas y comentarios (Cloudflare Workers + D1). El sitio estático se sirve desde ASSETS.
const enc = new TextEncoder();
const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const json = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h } });
const err = (code, s = 400) => json({ error: code }, s);
const ITER = 100000; // máximo permitido por PBKDF2 en Workers
const DAY = 86400000;

async function hashPw(pw, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return `${b64(salt)}$${b64(bits)}`;
}
async function checkPw(pw, stored) {
  const [s, h] = stored.split('$');
  const h2 = (await hashPw(pw, unb64(s))).split('$')[1];
  let d = h.length ^ h2.length;
  for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ (h2.charCodeAt(i) || 0);
  return d === 0;
}
const sha256 = async (s) => b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const getCookie = (req, n) =>
  (req.headers.get('Cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === n)?.[1];

async function currentUser(req, env) {
  const t = getCookie(req, 'eco_session');
  if (!t) return null;
  return env.DB.prepare(
    'SELECT u.id, u.name, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(await sha256(t), Date.now()).first();
}
async function newSession(env, uid) {
  const t = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]);
  await env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?,?,?)')
    .bind(await sha256(t), uid, Date.now() + 30 * DAY).run();
  return `eco_session=${t}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`;
}
async function tooMany(env, key, max, windowMs) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM attempts WHERE key = ? AND ts > ?').bind(key, Date.now() - windowMs).first();
  return r.n >= max;
}
const hit = (env, key) => env.DB.prepare('INSERT INTO attempts(key, ts) VALUES(?,?)').bind(key, Date.now()).run();

async function api(req, env, url) {
  const { pathname: p } = url, m = req.method;
  if (m !== 'GET') {
    const o = req.headers.get('Origin');
    if (o && o !== url.origin) return err('forbidden', 403);
  }
  const body = m === 'POST' ? await req.json().catch(() => ({})) : {};
  const ip = req.headers.get('CF-Connecting-IP') || 'x';

  if (p === '/api/me' && m === 'GET') {
    const u = await currentUser(req, env);
    return json({ user: u && { id: u.id, name: u.name } });
  }

  if (p === '/api/register' && m === 'POST') {
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
    if (name.length < 2 || name.length > 30 || /[\u0000-\u001f<>]/.test(name) ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pw.length < 8 || pw.length > 128) return err('invalid_input');
    if (await tooMany(env, 'reg:' + ip, 5, 3600000)) return err('too_many', 429);
    await hit(env, 'reg:' + ip);
    await env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(Date.now() - DAY).run();
    try {
      const r = await env.DB.prepare('INSERT INTO users(email, name, pw, created_at) VALUES(?,?,?,?)')
        .bind(email, name, await hashPw(pw), Date.now()).run();
      const cookie = await newSession(env, r.meta.last_row_id);
      return json({ user: { id: r.meta.last_row_id, name } }, 201, { 'Set-Cookie': cookie });
    } catch (e) {
      if (String(e).includes('UNIQUE')) return err('email_taken', 409);
      throw e;
    }
  }

  if (p === '/api/login' && m === 'POST') {
    const email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
    const key = 'login:' + ip + ':' + email;
    if (await tooMany(env, key, 8, 900000)) return err('too_many', 429);
    const u = await env.DB.prepare('SELECT id, name, pw FROM users WHERE email = ?').bind(email).first();
    // Se calcula el hash aunque el usuario no exista, para no revelar qué correos están registrados.
    const ok = u ? await checkPw(pw, u.pw) : (await hashPw(pw), false);
    if (!ok) { await hit(env, key); return err('bad_credentials', 401); }
    return json({ user: { id: u.id, name: u.name } }, 200, { 'Set-Cookie': await newSession(env, u.id) });
  }

  if (p === '/api/logout' && m === 'POST') {
    const t = getCookie(req, 'eco_session');
    if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': 'eco_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
  }

  if (p === '/api/comments' && m === 'GET') {
    const me = await currentUser(req, env);
    const before = parseInt(url.searchParams.get('before'), 10) || 9e15;
    const { results } = await env.DB.prepare(
      'SELECT c.id, c.body, c.created_at, c.user_id, u.name AS author FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id < ? ORDER BY c.id DESC LIMIT 11'
    ).bind(before).all();
    const more = results.length > 10;
    const items = results.slice(0, 10).map((c) => ({
      id: c.id, body: c.body, author: c.author, created_at: c.created_at,
      canDelete: !!me && (me.id === c.user_id || me.is_admin === 1),
    }));
    return json({ items, more });
  }

  if (p === '/api/comments' && m === 'POST') {
    const me = await currentUser(req, env);
    if (!me) return err('auth_required', 401);
    const text = String(body.body || '').trim();
    if (!text || text.length > 500) return err('invalid_input');
    if (await tooMany(env, 'c:' + me.id, 5, 60000)) return err('too_many', 429);
    await hit(env, 'c:' + me.id);
    await env.DB.prepare('INSERT INTO comments(user_id, body, created_at) VALUES(?,?,?)').bind(me.id, text, Date.now()).run();
    return json({ ok: true }, 201);
  }

  const del = p.match(/^\/api\/comments\/(\d+)$/);
  if (del && m === 'DELETE') {
    const me = await currentUser(req, env);
    if (!me) return err('auth_required', 401);
    const c = await env.DB.prepare('SELECT user_id FROM comments WHERE id = ?').bind(del[1]).first();
    if (!c) return err('not_found', 404);
    if (c.user_id !== me.id && me.is_admin !== 1) return err('forbidden', 403);
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(del[1]).run();
    return json({ ok: true });
  }
  return err('not_found', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try { return await api(req, env, url); }
    catch (e) { console.error(e); return err('server', 500); }
  },
};
