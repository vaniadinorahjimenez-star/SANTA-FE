/**
 * Netlify Serverless Function: clip-payment.js
 * Ruta: /.netlify/functions/clip-payment
 * 
 * Gestiona cobros presenciales con terminales Clip conectadas a Wi-Fi
 * utilizando la API F2F PinPad de Clip (https://api.payclip.io/f2f/pinpad/v1/payment).
 * 
 * Variables de entorno requeridas en Netlify:
 * - CLIP_API_KEY: Llave de autenticación API obtenida del Panel de Desarrolladores de Clip.
 * - CLIP_SERIAL_NUMBER: (Opcional) Número de serie por defecto de la terminal Clip de la panadería.
 */

const CLIP_API_URL = 'https://api.payclip.io/f2f/pinpad/v1/payment';

// Encabezados CORS para permitir peticiones desde el frontend
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event, context) => {
  // Manejo de pre-flight CORS (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const apiKey = process.env.CLIP_API_KEY;

  try {
    let payload = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'INVALID_JSON', message: 'El cuerpo de la petición no es un JSON válido' })
        };
      }
    }

    const action = payload.action || event.queryStringParameters?.action || 'create_payment';

    // -------------------------------------------------------------
    // ACCIÓN 1: CONSULTAR ESTADO DE UN COBRO EXISTENTE (GET / POLLING)
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

      // Si no hay API key configurada en Netlify, retornamos respuesta simulada para pruebas
      if (!apiKey) {
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

      // Consulta a Clip PinPad API
      const statusUrl = `${CLIP_API_URL}?pinpadRequestId=${encodeURIComponent(requestId)}`;
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${apiKey}`,
          'Pinpad-Include-Detail': 'true',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
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
      const serialNumber = serial_number_pos || process.env.CLIP_SERIAL_NUMBER;

      if (!amount || amount <= 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'INVALID_AMOUNT', message: 'El monto a cobrar debe ser mayor a $0' })
        };
      }

      if (!serialNumber) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'MISSING_SERIAL',
            message: 'Falta el número de serie de la terminal Clip. Configúralo en los Ajustes o en CLIP_SERIAL_NUMBER'
          })
        };
      }

      // Si no hay API Key en Netlify, permitimos simular para desarrollo y pruebas del mostrador
      if (!apiKey) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            pinpad_request_id: 'mock_req_' + Date.now(),
            status: 'PENDING',
            amount: Number(amount),
            reference: reference || `TKT-${Date.now()}`,
            serial_number_pos: serialNumber,
            message: 'Intención enviada (Modo desarrollo: configura CLIP_API_KEY en Netlify para cobro real con tu terminal física)',
            is_mock: true
          })
        };
      }

      // Preparar payload para Clip API
      const clipBody = {
        amount: Number(Number(amount).toFixed(2)),
        reference: reference || `PAN-${Date.now()}`,
        serial_number_pos: serialNumber.trim(),
        preferences: {
          is_auto_print_receipt_enabled: true, // La terminal imprime comprobante si tiene rollo
          is_tip_enabled: false,               // Desactivar propina para agilizar la fila de la panadería
          is_retry_enabled: true
        }
      };

      // Controlador de Timeout: si la terminal está apagada o sin internet,
      // la API de Clip o la red puede demorar. Abortamos tras 10 segundos para dar respuesta rápida al cajero.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(CLIP_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clipBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseData = await response.json().catch(() => ({}));

        // MANEJO DE TERMINAL APAGADA, SIN SEÑAL O DESCONECTADA:
        // Clip retorna 400/504 o códigos como DEVICE_UNAVAILABLE / PINPAD_OFFLINE / NO_COMMUNICATION
        if (!response.ok) {
          const errorCode = responseData.code || responseData.error || `HTTP_${response.status}`;
          const errorMsg = (responseData.message || '').toLowerCase();

          const isOffline = 
            response.status === 504 || 
            response.status === 408 ||
            errorMsg.includes('offline') || 
            errorMsg.includes('unavailable') || 
            errorMsg.includes('unreachable') || 
            errorMsg.includes('timeout') ||
            errorMsg.includes('no connection') ||
            errorCode === 'DEVICE_UNAVAILABLE' ||
            errorCode === 'PINPAD_OFFLINE';

          if (isOffline) {
            return {
              statusCode: 503,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'TERMINAL_OFFLINE',
                message: 'La terminal Clip está apagada, en modo reposo o sin señal Wi-Fi. Enciéndela o conéctala a la red antes de cobrar.',
                details: responseData
              })
            };
          }

          if (errorMsg.includes('busy')) {
            return {
              statusCode: 409,
              headers: CORS_HEADERS,
              body: JSON.stringify({
                error: 'TERMINAL_BUSY',
                message: 'La terminal Clip está ocupada con otra transacción. Cancela la operación previa en la terminal y reintenta.',
                details: responseData
              })
            };
          }

          return {
            statusCode: response.status,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              error: errorCode,
              message: responseData.message || 'Error al comunicarse con la terminal Clip',
              details: responseData
            })
          };
        }

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
              message: 'Tiempo de espera agotado al conectar con la terminal Clip. Verifica que tenga señal Wi-Fi activa.'
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
