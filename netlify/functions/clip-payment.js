/**
 * Netlify Serverless Function: clip-payment.js
 * Ruta: /.netlify/functions/clip-payment (o /api/clip-payment)
 * 
 * Gestiona cobros presenciales con terminales Clip conectadas a Wi-Fi
 * utilizando la API F2F PinPad de Clip (https://api.payclip.io/f2f/pinpad/v1/payment).
 * 
 * Variables de entorno soportadas en Netlify:
 * - CLIP_API_KEY: Llave de autenticación API obtenida del Panel de Desarrolladores de Clip.
 *   Puede ser:
 *   a) Token Basic completo: "Basic YWJhNWJkNjQt..."
 *   b) Base64 del par: "YWJhNWJkNjQt..."
 *   c) Par sin codificar: "api_key:secret_key"
 * - CLIP_TERMINAL_SERIAL o CLIP_SERIAL_NUMBER: Número de serie de la terminal Clip (ej. P8C22408050000156).
 */

const CLIP_API_URL = 'https://api.payclip.io/f2f/pinpad/v1/payment';

// Encabezados CORS para permitir peticiones desde el frontend
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

/**
 * Normaliza el token de autorización para Clip.
 * Clip requiere: 'Authorization: Basic <base64(api_key:secret_key)>'
 */
function normalizeClipAuthHeader(rawKey) {
  if (!rawKey) return '';
  let key = rawKey.trim();

  // Remover comillas envolventes si el usuario las puso en Netlify
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

  // Caso 4: Cadena que ya es base64 o token directo
  return `Basic ${key}`;
}

exports.handler = async (event) => {
  // Manejo de pre-flight CORS (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const rawApiKey = process.env.CLIP_API_KEY;
  const envSerial = process.env.CLIP_TERMINAL_SERIAL || process.env.CLIP_SERIAL_NUMBER;
  const authHeaderValue = normalizeClipAuthHeader(rawApiKey);

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

    const action = payload.action || event.queryStringParameters?.action || 'create_payment';

    // -------------------------------------------------------------
    // ACCIÓN 0: DIAGNÓSTICO DE CONEXIÓN CON CLIP
    // -------------------------------------------------------------
    if (action === 'diagnose') {
      const serialToTest = payload.serial_number_pos || envSerial || 'P8C22408050000156';
      
      const diagnosis = {
        has_api_key: Boolean(rawApiKey && rawApiKey.trim().length > 0),
        api_key_length: rawApiKey ? rawApiKey.trim().length : 0,
        auth_header_format: authHeaderValue ? (authHeaderValue.startsWith('Basic ') ? 'Basic <Token>' : 'Personalizado') : 'NO_CONFIGURADO',
        has_env_serial: Boolean(envSerial && envSerial.trim().length > 0),
        env_serial_value: envSerial || null,
        serial_tested: serialToTest,
        timestamp: new Date().toISOString()
      };

      if (!rawApiKey) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: 'ERROR',
            code: 'MISSING_API_KEY',
            message: 'Netlify no tiene configurada la variable CLIP_API_KEY, o necesitas hacer un nuevo Deploy.',
            diagnosis,
            advice: 'Ve a Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.'
          })
        };
      }

      // Probar conexión real haciendo GET a Clip PinPad API
      try {
        const testRes = await fetch(`${CLIP_API_URL}?pinpadRequestId=diag_test`, {
          method: 'GET',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          }
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
    // ACCIÓN 1: CONSULTAR ESTADO DE UN COBRO EXISTENTE (POLLING)
    // -------------------------------------------------------------
    if (action === 'check_status') {
      const requestId = payload.pinpad_request_id || event.queryStringParameters?.pinpad_request_id;
      if (!requestId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'MISSING_REQUEST_ID', message: 'Falta el pinpad_request_id' })
        };
      }

      // Si no hay API key en Netlify, simular para pruebas de desarrollo
      if (!rawApiKey) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: 'APPROVED',
            message: 'Cobro aprobado exitosamente (Modo Simulación)',
            auth_code: 'CLIP-' + Math.floor(100000 + Math.random() * 900000),
            last_4: '4242',
            receipt_no: 'RCP-' + Date.now().toString().slice(-6),
            is_mock: true
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
    // ACCIÓN 2: ENVIAR NUEVO COBRO A LA TERMINAL CLIP CON WI-FI
    // -------------------------------------------------------------
    if (action === 'create_payment') {
      const { amount, reference, serial_number_pos } = payload;
      const serialNumber = serial_number_pos || envSerial;

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

      if (!serialNumber) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'MISSING_SERIAL',
            message: 'Falta el número de serie de la terminal Clip. Configúralo en los Ajustes o en CLIP_TERMINAL_SERIAL'
          })
        };
      }

      // Si no hay API Key en Netlify:
      // Verificamos si el usuario acaba de agregar las variables y olvidó hacer re-deploy
      if (!rawApiKey) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'NETLIFY_REDEPLOY_NEEDED',
            message: 'No se detectó CLIP_API_KEY en Netlify. Si acabas de guardarla, debes ir a Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site para que las variables tengan efecto en el servidor.',
            is_mock: false
          })
        };
      }

      // Preparar payload para Clip API (documentación oficial Clip Pinpad F2F)
      const clipBody = {
        amount: Number(Number(amount).toFixed(2)),
        reference: reference || `PAN-${Date.now()}`,
        serial_number_pos: serialNumber.trim(),
        preferences: {
          is_auto_print_receipt_enabled: true,
          is_tip_enabled: false,
          is_retry_enabled: true
        }
      };

      // Controlador de Timeout: 12 segundos máximos para recibir respuesta de la terminal
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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

          // 1. Error de Autenticación (401 o 403)
          if (response.status === 401 || response.status === 403 || lowerMsg.includes('unauthorized') || rawCode === 'UNAUTHORIZED') {
            return {
              statusCode: 401,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'CLIP_AUTH_ERROR',
                http_status: response.status,
                message: 'Error de Autenticación (401): Tu CLIP_API_KEY no es válida o Clip no la reconoce. Revisa tu token en developer.clip.mx y que esté guardada en Netlify.',
                details: responseData
              })
            };
          }

          // 2. Terminal no encontrada o serie incorrecta (400 o 404)
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
                message: `La terminal con serie "${serialNumber.trim()}" no está vinculada a la cuenta de Clip que generó tu API Key. Verifica en la app Clip que tu terminal esté en la misma cuenta.`,
                details: responseData
              })
            };
          }

          // 3. Terminal apagada o sin internet Wi-Fi (503, 504, 408)
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
                message: 'La terminal Clip está apagada, en reposo o sin señal Wi-Fi. Enciéndela o conéctala a la red antes de cobrar.',
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
                message: 'La terminal Clip está ocupada con otra transacción. Cancela la operación previa en la terminal y reintenta.',
                details: responseData
              })
            };
          }

          // 5. Otros errores de la API de Clip
          return {
            statusCode: response.status,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              error: rawCode,
              http_status: response.status,
              message: rawMsg || `Error de la API de Clip (Código ${response.status})`,
              details: responseData
            })
          };
        }

        // Éxito: la intención de pago se envió a la terminal
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
              message: 'Tiempo de espera agotado (12s). La terminal Clip no respondió a la orden Wi-Fi.'
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
        message: error.message || 'Error interno del servidor al procesar con Clip'
      })
    };
  }
};
