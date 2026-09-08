/**
 * Frontend Service: clipService.ts
 * Comunicación directa con la Terminal Clip Wi-Fi a través de la función de backend
 */

export interface ClipConfig {
  serialNumber: string;
  terminalName?: string;
  autoPrintReceipt?: boolean;
  apiKey?: string;       // API Key pública o token completo
  secretKey?: string;    // Clave secreta (Secret Key) de developer.clip.mx
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
}

const STORAGE_KEY = 'bakery_clip_terminal_config';
export const DEFAULT_CLIP_SERIAL = 'P8C2240805000156';

// Obtener configuración guardada de la terminal Clip en el navegador
export function getStoredClipConfig(): ClipConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.serialNumber === 'string') {
        // Auto-corregir número de serie previo con typo (4 ceros -> 3 ceros)
        if (
          parsed.serialNumber === 'P8C22408050000156' || 
          parsed.serialNumber === '08221800012345' ||
          parsed.serialNumber.trim() === ''
        ) {
          parsed.serialNumber = DEFAULT_CLIP_SERIAL;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer configuración de Clip:', e);
  }
  return {
    serialNumber: DEFAULT_CLIP_SERIAL,
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
 * Enviar orden de cobro 100% REAL a la terminal Clip
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
}> {
  const config = getStoredClipConfig();
  const serial = config.serialNumber?.trim() || DEFAULT_CLIP_SERIAL;

  try {
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
        serial_number_pos: serial,
        api_key: config.apiKey || undefined,
        secret_key: config.secretKey || undefined
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
        message: data.message || `Error de conexión con la terminal Clip (${response.status})`,
        details: data.details || data
      };
    }

    return {
      success: true,
      pinpadRequestId: data.pinpad_request_id || data.id
    };

  } catch (err: any) {
    console.warn('Fallo de red al conectar con terminal Clip:', err);
    return {
      success: false,
      errorType: 'TERMINAL_TIMEOUT',
      message: 'No se pudo contactar la terminal Clip. Revisa que esté encendida y conectada a tu Wi-Fi.'
    };
  }
}

/**
 * Consulta periódica (Polling) del estado del cobro en la terminal Clip (Sin simulación)
 */
export async function pollClipPaymentStatus(
  pinpadRequestId: string,
  onStatusUpdate: (statusText: string) => void,
  signal?: AbortSignal,
  maxAttempts: number = 36 // 36 intentos * 2.5s = ~90 segundos
): Promise<ClipPaymentResult> {
  const config = getStoredClipConfig();
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      return {
        success: false,
        errorType: 'CANCELLED',
        message: 'Operación cancelada en caja.'
      };
    }

    attempts++;
    onStatusUpdate(`Esperando tarjeta o NIP en tu terminal Clip... (${attempts}/${maxAttempts})`);

    try {
      const response = await fetch('/.netlify/functions/clip-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          pinpad_request_id: pinpadRequestId,
          api_key: config.apiKey || undefined,
          secret_key: config.secretKey || undefined
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
            authCode: data.auth_code || data.authCode || data.authorization_code || 'APROBADO',
            last4: data.last_4 || data.last4 || data.card?.last4 || '••••',
            reference: data.reference || pinpadRequestId
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
            message: 'El cobro fue cancelado en la pantalla de la terminal Clip.'
          };
        }
      }
    } catch (err: any) {
      if (signal?.aborted) {
        return { success: false, errorType: 'CANCELLED', message: 'Operación cancelada.' };
      }
      console.warn('Sondeo Clip en curso:', err);
    }

    // Pausa de 2.5 segundos entre revisiones
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  return {
    success: false,
    status: 'TIMEOUT',
    errorType: 'TERMINAL_TIMEOUT',
    message: 'Tiempo de espera agotado en la terminal. El cliente no completó el pago a tiempo.'
  };
}

/**
 * Diagnosticar conexión real con Clip y estado del servidor
 */
export async function diagnoseClipConnection(serialNumber?: string): Promise<{
  success: boolean;
  status: string;
  message?: string;
  diagnosis?: any;
  clip_http_status?: number;
  clip_response?: any;
  is_serial_in_account?: boolean;
  devices_found?: any[];
  advice?: string;
}> {
  try {
    const config = getStoredClipConfig();
    const serial = serialNumber || config.serialNumber || DEFAULT_CLIP_SERIAL;

    const response = await fetch('/.netlify/functions/clip-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'diagnose',
        serial_number_pos: serial,
        api_key: config.apiKey || undefined,
        secret_key: config.secretKey || undefined
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
      is_serial_in_account: data.is_serial_in_account,
      devices_found: data.devices_found,
      advice: data.advice
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'FETCH_ERROR',
      message: err.message || 'No se pudo contactar el servicio de Clip.'
    };
  }
}
