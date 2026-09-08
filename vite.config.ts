import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Plugin para conectar directamente con la API real de Clip Pinpad F2F en desarrollo
function clipNetlifyFunctionDevPlugin(): Plugin {
  return {
    name: 'clip-netlify-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/.netlify/functions/clip-payment')) {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, Pinpad-Include-Detail',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            });
            return res.end();
          }

          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              let payload: any = {};
              if (bodyStr) {
                try { payload = JSON.parse(bodyStr); } catch (e) {}
              }

              const rawApiKey = payload.api_key || process.env.CLIP_API_KEY;
              const serial = (payload.serial_number_pos || process.env.CLIP_TERMINAL_SERIAL || 'P8C2240805000156').trim();
              const action = payload.action || 'create_payment';

              let authHeader = '';
              if (rawApiKey) {
                let key = String(rawApiKey).trim();
                if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                  key = key.slice(1, -1).trim();
                }
                if (/^basic\s+/i.test(key) || /^bearer\s+/i.test(key)) {
                  authHeader = key;
                } else if (key.includes(':')) {
                  authHeader = `Basic ${Buffer.from(key).toString('base64')}`;
                } else {
                  authHeader = `Basic ${key}`;
                }
              }

              const headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
              };

              // DIAGNOSTIC
              if (action === 'diagnose') {
                if (!rawApiKey) {
                  res.writeHead(200, headers);
                  return res.end(JSON.stringify({
                    status: 'MISSING_API_KEY',
                    message: 'Falta tu CLIP_API_KEY. Ingrésala en Ajustes de la panadería o configúrala en Netlify.',
                    diagnosis: { has_api_key: false, env_serial_value: serial }
                  }));
                }

                try {
                  const clipRes = await fetch('https://api.payclip.io/f2f/pinpad/v1/payment', {
                    method: 'POST',
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 0.01, reference: 'PING-TEST', serial_number_pos: serial })
                  });
                  const clipData = await clipRes.json().catch(() => ({}));
                  res.writeHead(200, headers);
                  return res.end(JSON.stringify({
                    status: clipRes.status === 401 ? 'AUTH_FAILED' : 'CONNECTED',
                    clip_http_status: clipRes.status,
                    clip_response: clipData,
                    diagnosis: { has_api_key: true, env_serial_value: serial, auth_header_format: 'Basic [OK]' }
                  }));
                } catch (e: any) {
                  res.writeHead(200, headers);
                  return res.end(JSON.stringify({ status: 'NETWORK_ERROR', message: e.message }));
                }
              }

              // CHECK STATUS (POLLING REAL)
              if (action === 'check_status') {
                const reqId = payload.pinpad_request_id;
                if (!authHeader) {
                  res.writeHead(400, headers);
                  return res.end(JSON.stringify({ error: 'MISSING_API_KEY', message: 'Falta CLIP_API_KEY' }));
                }
                const clipRes = await fetch(`https://api.payclip.io/f2f/pinpad/v1/payment?pinpadRequestId=${encodeURIComponent(reqId)}`, {
                  method: 'GET',
                  headers: { 'Authorization': authHeader, 'Pinpad-Include-Detail': 'true' }
                });
                const clipData = await clipRes.json().catch(() => ({}));
                res.writeHead(clipRes.status, headers);
                return res.end(JSON.stringify(clipData));
              }

              // CREATE REAL PAYMENT
              if (!authHeader) {
                res.writeHead(400, headers);
                return res.end(JSON.stringify({
                  error: 'NETLIFY_REDEPLOY_NEEDED',
                  message: 'Falta tu CLIP_API_KEY. Ingrésala en Ajustes de la Panadería o en tu panel de Netlify (y haz Trigger deploy).'
                }));
              }

              const clipRes = await fetch('https://api.payclip.io/f2f/pinpad/v1/payment', {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: Number(Number(payload.amount).toFixed(2)),
                  reference: payload.reference || `PAN-${Date.now()}`,
                  serial_number_pos: serial,
                  preferences: { is_auto_print_receipt_enabled: true, is_tip_enabled: false, is_retry_enabled: true }
                })
              });

              const clipData = await clipRes.json().catch(() => ({}));
              res.writeHead(clipRes.status, headers);
              return res.end(JSON.stringify(clipData));

            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              return res.end(JSON.stringify({ error: 'DEV_PROXY_ERROR', message: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), clipNetlifyFunctionDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
