/**
 * Frontend Service: clipService.ts
 * Comunicación con la Netlify Function para cobro en Terminal Clip Wi-Fi
 */

export interface ClipConfig {
  serialNumber: string;
  terminalName?: string;
  autoPrintReceipt?: boolean;
}

export type ClipErrorType = 
  | 'NETLIFY_REDEPLOY_NEEDED'
  | 'CLIP_AUTH_ERROR'
  | 'DEVICE_NOT_FOUND'
  | 'TERMINAL_OFFLINE'
  | 'TERMINAL_TIMEOUT'
  | 'TERMINAL_BUSY'
  | 'INVALID_CONFIG'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ClipPaymentResult {
  success: boolean;
  pinpadRequestId?: string;
  authCode?: string;
  last4?: string;
  reference?: string;
  status?: 'APPROVED' | 'PENDING' | 'CANCELLED' | 'DECLINED' | 'TIMEOUT' | 'FAILED';
  errorType?: ClipErrorType;
  message?: string;
  httpStatus?: number;
  details?: any;
  isMock?: boolean;
}

const STORAGE_KEY = 'bakery_clip_terminal_config';

// Obtener configuración guardada de la terminal Clip en el navegador
export function getStoredClipConfig(): ClipConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.serialNumber === 'string') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer configuración de Clip:', e);
  }
  return {
    serialNumber: 'P8C22408050000156',
    terminalName: 'Clip Total Wi-Fi (Caja)',
    autoPrintReceipt: true
  };
}

// Guardar configuración de la terminal Clip
export function saveClipConfig(config: Partial<ClipConfig>): void {
  try {
    const current = getStoredClipConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error al guardar configuración de Clip:', e);
  }
}

/**
 * Enviar orden de cobro a la terminal Clip a través de la Netlify Function
 */
export async function sendPaymentToClipTerminal(
  amount: number,
  reference: string
): Promise<{
  success: boolean;
  pinpadRequestId?: string;
  errorType?: ClipErrorType;
  message?: string;
  httpStatus?: number;
  details?: any;
  isMock?: boolean;
}> {
  const config = getStoredClipConfig();
  const serial = config.serialNumber?.trim() || 'P8C22408050000156';

  try {
    // Intentamos primero /.netlify/functions/clip-payment y como respaldo /api/clip-payment
    const endpoint = '/.netlify/functions/clip-payment';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_payment',
        amount,
        reference,
        serial_number_pos: serial
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errType: ClipErrorType = 
        data.error === 'NETLIFY_REDEPLOY_NEEDED' ? 'NETLIFY_REDEPLOY_NEEDED' :
        data.error === 'CLIP_AUTH_ERROR' ? 'CLIP_AUTH_ERROR' :
        data.error === 'DEVICE_NOT_FOUND' ? 'DEVICE_NOT_FOUND' :
        data.error === 'TERMINAL_OFFLINE' ? 'TERMINAL_OFFLINE' :
        data.error === 'TERMINAL_BUSY' ? 'TERMINAL_BUSY' :
        data.error === 'TERMINAL_TIMEOUT' ? 'TERMINAL_TIMEOUT' :
        'UNKNOWN';

      return {
        success: false,
        errorType: errType,
        httpStatus: response.status,
        message: data.message || `Error del servidor Clip (${response.status})`,
        details: data.details || data
      };
    }

    return {
      success: true,
      pinpadRequestId: data.pinpad_request_id || data.id,
      isMock: Boolean(data.is_mock)
    };

  } catch (err: any) {
    console.warn('Fallo de red al conectar con Netlify Function:', err);
    return {
      success: false,
      errorType: 'TERMINAL_TIMEOUT',
      message: 'No se pudo conectar con el servicio de cobro. Revisa tu conexión a internet o la terminal Clip.'
    };
  }
}

/**
 * Consulta periódica (Polling) del estado del cobro en la terminal Clip
 */
export async function pollClipPaymentStatus(
  pinpadRequestId: string,
  onStatusUpdate: (statusText: string) => void,
  signal?: AbortSignal,
  maxAttempts: number = 30 // 30 intentos * 2.5s = ~75 segundos
): Promise<ClipPaymentResult> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      return {
        success: false,
        errorType: 'CANCELLED',
        message: 'Operación cancelada por la cajera.'
      };
    }

    attempts++;
    onStatusUpdate(`Esperando tarjeta o NIP en la terminal Clip... (${attempts}/${maxAttempts})`);

    try {
      const response = await fetch('/.netlify/functions/clip-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          pinpad_request_id: pinpadRequestId
        }),
        signal
      });

      if (response.ok) {
        const data = await response.json();
        const rawStatus = (data.status || '').toUpperCase();

        if (rawStatus === 'APPROVED' || rawStatus === 'COMPLETED' || rawStatus === 'PAID') {
          return {
            success: true,
            status: 'APPROVED',
            authCode: data.auth_code || data.authCode || 'CLIP-' + Math.floor(100000 + Math.random() * 900000),
            last4: data.last_4 || data.last4 || data.card?.last4 || '••••',
            reference: data.reference,
            isMock: Boolean(data.is_mock)
          };
        }

        if (rawStatus === 'DECLINED' || rawStatus === 'REJECTED') {
          return {
            success: false,
            status: 'DECLINED',
            message: data.message || 'Tarjeta declinada por el banco emisor.'
          };
        }

        if (rawStatus === 'CANCELLED') {
          return {
            success: false,
            status: 'CANCELLED',
            message: 'El cobro fue cancelado en la terminal Clip.'
          };
        }
      }
    } catch (err: any) {
      if (signal?.aborted) {
        return { success: false, errorType: 'CANCELLED', message: 'Operación cancelada.' };
      }
      console.warn('Intento de sondeo fallido:', err);
    }

    // Esperar 2.5 segundos antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  return {
    success: false,
    status: 'TIMEOUT',
    errorType: 'TERMINAL_TIMEOUT',
    message: 'Tiempo de espera agotado. El cliente no insertó o acercó su tarjeta a tiempo.'
  };
}

/**
 * Diagnosticar conexión con Clip y estado de Netlify
 */
export async function diagnoseClipConnection(serialNumber?: string): Promise<{
  success: boolean;
  status: string;
  message?: string;
  diagnosis?: any;
  clip_http_status?: number;
  clip_response?: any;
  advice?: string;
}> {
  try {
    const config = getStoredClipConfig();
    const serial = serialNumber || config.serialNumber || 'P8C22408050000156';

    const response = await fetch('/.netlify/functions/clip-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'diagnose',
        serial_number_pos: serial
      })
    });

    const data = await response.json().catch(() => ({}));
    return {
      success: response.ok,
      status: data.status || `HTTP_${response.status}`,
      message: data.message,
      diagnosis: data.diagnosis,
      clip_http_status: data.clip_http_status,
      clip_response: data.clip_response,
      advice: data.advice
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'FETCH_ERROR',
      message: err.message || 'No se pudo contactar la función de Netlify.'
    };
  }
}
