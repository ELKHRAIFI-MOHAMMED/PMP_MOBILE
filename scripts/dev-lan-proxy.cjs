/**
 * Development only: exposes the local Django API (127.0.0.1:8000) on the PC's Wi-Fi addresses, port 8000,
 * so a phone running Expo Go can reach it without a Windows firewall rule for Python
 * (Node.js is usually already allowed because Metro needs it).
 *
 * Usage:  node scripts/dev-lan-proxy.cjs        (Django must run on 127.0.0.1:8000)
 */
const http = require('http');
const os = require('os');

const TARGET = { host: '127.0.0.1', port: Number(process.env.API_PORT || 8000) };
const lanAddresses = Object.values(os.networkInterfaces()).flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a.address))
  .map((a) => a.address);

if (!lanAddresses.length) { console.error('Aucune adresse réseau local trouvée.'); process.exit(1); }

for (const address of lanAddresses) {
  http.createServer((req, res) => {
    const upstream = http.request({ ...TARGET, method: req.method, path: req.url, headers: req.headers }, (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"detail":"API Django injoignable sur 127.0.0.1:8000."}'); });
    req.pipe(upstream);
  }).on('error', (e) => console.error(`${address}:${TARGET.port} — ${e.message}`))
    .listen(TARGET.port, address, () => console.log(`API exposée sur http://${address}:${TARGET.port} → http://${TARGET.host}:${TARGET.port}`));
}
