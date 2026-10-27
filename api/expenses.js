const guard = require('./_guard');
const BASE = 'https://zender-web-production-9a98.up.railway.app';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!guard(req, res)) return;
  const path = String(req.query.path || '');
  if (!/^(health|session|workspace|wallet(?:\/faucet)?|tasks(?:\/[a-z0-9-]+(?:\/(?:credentials|close|receipt|purchases))?)?|purchases\/[a-z0-9-]+(?:\/(?:approve|reject|execute|recover))?)$/.test(path)) return res.status(404).json({error:'Not found.'});
  try {
    const url = new URL('/api/' + path, BASE);
    if (req.query.details === 'true') url.searchParams.set('details', 'true');
    const headers = {'content-type':'application/json'};
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    if (req.headers.cookie) headers.cookie = req.headers.cookie;
    const response = await fetch(url, {method:req.method, headers, redirect:'error', signal:AbortSignal.timeout(290000), ...(['POST','PUT','PATCH','DELETE'].includes(req.method)?{body:JSON.stringify(req.body || {})}:{})});
    const cookie = response.headers.get('set-cookie'); if (cookie) res.setHeader('Set-Cookie', cookie);
    res.status(response.status).json(await response.json());
  } catch { res.status(502).json({error:'The workspace is temporarily unavailable. Please try again.'}); }
};
