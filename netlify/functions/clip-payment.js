/**
 * Netlify Serverless Function: clip-payment.js
 * Ruta: /.netlify/functions/clip-payment
 * 
 * Conexión 100% REAL con la API de Clip Pinpad (F2F):
 * Endpoint: https://api.payclip.io/f2f/pinpad/v1/payment
 * 
 * Sin ninguna simulación de prueba. Comunicación directa con terminales Clip Wi-Fi.
 */

const CLIP_API_URL = 'https://api.payclip.io/f2f/pinpad/v1/payment';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Pinpad-Include-Detail',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

/**
 * Normaliza y limpia el encabezado de autorización requerido por Clip.
 * Clip API requiere: Authorization: Basic <base64_encoded_token>
 */
function normalizeClipAuthHeader(rawKey) {
  if (!rawKey) return '';
  let key = String(rawKey).trim();

  // Remover comillas si se agregaron accidentalmente
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Caso 1: Ya tiene el prefijo "Basic "
  if (/^basic\s+/i.test(key)) {
    return key;
  }

  // Caso 2: Tiene prefijo "Bearer "
  if (/^bearer\s+/i.test(key)) {
    return key;
  }

  // Caso 3: Formato api_key:secret_key (en texto plano)
  if (key.includes(':')) {
    const encoded = Buffer.from(key, 'utf-8').toString('base64');
    return `Basic ${encoded}`;
  }

  // Caso 4: Token base64 directo
  return `Basic ${key}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    let payload = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            error: 'INVALID_JSON', 
            message: 'El cuerpo de la petición no es un JSON válido' 
          })
        };
      }
    }

    // Obtenemos la llave desde el payload del cliente o variables de Netlify
    const rawApiKey = payload.api_key || process.env.CLIP_API_KEY;
    const defaultSerial = 'P8C2240805000156';
    const serialNumber = (payload.serial_number_pos || process.env.CLIP_TERMINAL_SERIAL || process.env.CLIP_SERIAL_NUMBER || defaultSerial).trim();
    const authHeaderValue = normalizeClipAuthHeader(rawApiKey);

    const action = payload.action || event.queryStringParameters?.action || 'create_payment';

    // -------------------------------------------------------------
    // ACCIÓN: DIAGNÓSTICO DE CONEXIÓN
    // -------------------------------------------------------------
    if (action === 'diagnose') {
      const hasApiKey = Boolean(rawApiKey);
      const diagnosis = {
        has_api_key: hasApiKey,
        auth_header_format: hasApiKey ? (authHeaderValue.startsWith('Basic ') ? 'Basic [OK]' : 'Bearer [OK]') : 'Falta CLIP_API_KEY',
        env_serial_value: serialNumber,
        node_env: process.env.NODE_ENV || 'production'
      };

      if (!hasApiKey) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: 'MISSING_ENV_VARS',
            message: 'Netlify aún no tiene activa la variable CLIP_API_KEY en este deploy. Realiza en Netlify: Deploys -> Trigger deploy -> Clear cache and deploy site, o ingrésala en Ajustes de la panadería.',
            diagnosis,
            advice: 'Las variables solo se aplican en Netlify tras compilar un nuevo despliegue.'
          })
        };
      }

      try {
        const testRes = await fetch(CLIP_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: 0.01,
            reference: 'PING-TEST',
            serial_number_pos: serialNumber
          })
        });

        const testData = await testRes.json().catch(() => ({}));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: testRes.status === 401 ? 'AUTH_FAILED' : 'CONNECTED',
            clip_http_status: testRes.status,
            clip_response: testData,
            diagnosis
          })
        };
      } catch (err) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: 'NETWORK_ERROR',
            message: err.message,
            diagnosis
          })
        };
      }
    }

    // -------------------------------------------------------------
    // ACCIÓN: CONSULTAR ESTADO DE PAGO EN LA TERMINAL (POLLING REAL)
    // -------------------------------------------------------------
    if (action === 'check_status') {
      const requestId = payload.pinpad_request_id || event.queryStringParameters?.pinpad_request_id;
      if (!requestId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'MISSING_REQUEST_ID', message: 'Falta el pinpad_request_id para consultar' })
        };
      }

      if (!rawApiKey) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'MISSING_API_KEY',
            message: 'Falta la credencial CLIP_API_KEY para verificar el estado en Clip.'
          })
        };
      }

      const statusUrl = `${CLIP_API_URL}?pinpadRequestId=${encodeURIComponent(requestId)}`;
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeaderValue,
          'Pinpad-Include-Detail': 'true',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    }

    // -------------------------------------------------------------
    // ACCIÓN: ENVIAR NUEVO COBRO REAL A LA TERMINAL CLIP
    // -------------------------------------------------------------
    if (action === 'create_payment') {
      const { amount, reference } = payload;

      if (!amount || amount <= 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            error: 'INVALID_AMOUNT', 
            message: 'El monto a cobrar debe ser mayor a $0' 
          })
        };
      }

      if (!rawApiKey) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'NETLIFY_REDEPLOY_NEEDED',
            message: 'No se detectó CLIP_API_KEY activa en el servidor. En Netlify: Ve a Deploys -> Trigger deploy -> Clear cache and deploy site (o ingresa tu clave en Ajustes).',
            is_mock: false
          })
        };
      }

      // Payload oficial Clip PinPad API
      const clipBody = {
        amount: Number(Number(amount).toFixed(2)),
        reference: reference || `PAN-${Date.now()}`,
        serial_number_pos: serialNumber,
        preferences: {
          is_auto_print_receipt_enabled: true,
          is_tip_enabled: false,
          is_retry_enabled: true
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      try {
        const response = await fetch(CLIP_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clipBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          const rawCode = responseData.code || responseData.error || `HTTP_${response.status}`;
          const rawMsg = responseData.message || responseData.description || responseData.error_description || '';
          const lowerMsg = rawMsg.toLowerCase();

          // 1. Error de Autenticación 401
          if (response.status === 401 || response.status === 403 || lowerMsg.includes('unauthorized') || rawCode === 'UNAUTHORIZED') {
            return {
              statusCode: 401,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'CLIP_AUTH_ERROR',
                http_status: response.status,
                message: 'Error de Autenticación (401): Tu CLIP_API_KEY no es válida o Clip no la reconoce. Verifica tu token en developer.clip.mx.',
                details: responseData
              })
            };
          }

          // 2. Terminal no encontrada o serie no dada de alta en la cuenta
          if (
            response.status === 404 || 
            rawCode === 'DEVICE_NOT_FOUND' || 
            rawCode === 'PINPAD_NOT_FOUND' || 
            lowerMsg.includes('not found') || 
            lowerMsg.includes('not registered') ||
            lowerMsg.includes('serial')
          ) {
            return {
              statusCode: 404,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'DEVICE_NOT_FOUND',
                http_status: response.status,
                message: `La terminal con serie "${serialNumber}" no fue encontrada en la cuenta Clip de tu API Key. Verifica que la serie sea P8C2240805000156 y esté en tu cuenta de Clip.`,
                details: responseData
              })
            };
          }

          // 3. Terminal apagada o sin conexión Wi-Fi (503, 504, 408)
          const isOffline = 
            response.status === 503 || 
            response.status === 504 || 
            response.status === 408 ||
            lowerMsg.includes('offline') || 
            lowerMsg.includes('unavailable') || 
            lowerMsg.includes('unreachable') || 
            lowerMsg.includes('timeout') ||
            lowerMsg.includes('no connection') ||
            rawCode === 'DEVICE_UNAVAILABLE' ||
            rawCode === 'PINPAD_OFFLINE';

          if (isOffline) {
            return {
              statusCode: 503,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'TERMINAL_OFFLINE',
                http_status: response.status,
                message: 'La terminal Clip P8C2240805000156 está apagada, en reposo o sin señal Wi-Fi. Por favor enciéndela y verifica que tenga conexión a internet.',
                details: responseData
              })
            };
          }

          // 4. Terminal ocupada
          if (lowerMsg.includes('busy') || rawCode === 'DEVICE_BUSY') {
            return {
              statusCode: 409,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'TERMINAL_BUSY',
                http_status: response.status,
                message: 'La terminal Clip está ocupada con otra transacción en pantalla. Cancela la operación previa en la terminal y reintenta.',
                details: responseData
              })
            };
          }

          return {
            statusCode: response.status,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              error: rawCode,
              http_status: response.status,
              message: rawMsg || `Error de la API de Clip (HTTP ${response.status})`,
              details: responseData
            })
          };
        }

        // Éxito: orden enviada directamente a la terminal
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(responseData)
        };

      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          return {
            statusCode: 504,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              error: 'TERMINAL_TIMEOUT',
              message: 'Tiempo de espera agotado (14s). La terminal Clip no respondió a la orden Wi-Fi.'
            })
          };
        }
        throw fetchErr;
      }
    }

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'UNKNOWN_ACTION', message: `Acción '${action}' no reconocida` })
    };

  } catch (error) {
    console.error('Error en Netlify Function clip-payment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error interno al comunicarse con Clip'
      })
    };
  }
};
