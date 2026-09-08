/**
 * Frontend Service: clipService.ts
 * Comunicación con la Netlify Function para cobro en Terminal Clip Wi-Fi
 */

export interface ClipConfig {
  serialNumber: string;
  terminalName?: string;
  autoPrintReceipt?: boolean;
}

export interface ClipPaymentResult {
  success: boolean;
  pinpadRequestId?: string;
  authCode?: string;
  last4?: string;
  reference?: string;
  status?: 'APPROVED' | 'PENDING' | 'CANCELLED' | 'DECLINED' | 'TIMEOUT' | 'FAILED';
  errorType?: 'TERMINAL_OFFLINE' | 'TERMINAL_TIMEOUT' | 'TERMINAL_BUSY' | 'INVALID_CONFIG' | 'CANCELLED' | 'UNKNOWN';
  message?: string;
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
    serialNumber: '08221800012345', // Número de serie de ejemplo
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
): Promise<{ success: boolean; pinpadRequestId?: string; errorType?: string; message?: string; isMock?: boolean }> {
  const config = getStoredClipConfig();

  if (!config.serialNumber || !config.serialNumber.trim()) {
    return {
      success: false,
      errorType: 'INVALID_CONFIG',
      message: 'Falta configurar el número de serie de tu terminal Clip (ej. N600-XXXXX o 0822...).'
    };
  }

  try {
    // Llamada a la Netlify Function
    const response = await fetch('/.netlify/functions/clip-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_payment',
        amount,
        reference,
        serial_number_pos: config.serialNumber.trim()
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Manejo específico de terminal apagada o sin señal
      if (response.status === 503 || data.error === 'TERMINAL_OFFLINE') {
        return {
          success: false,
          errorType: 'TERMINAL_OFFLINE',
          message: data.message || 'La terminal Clip está apagada o sin señal Wi-Fi.'
        };
      }
      if (response.status === 504 || data.error === 'TERMINAL_TIMEOUT') {
        return {
          success: false,
          errorType: 'TERMINAL_TIMEOUT',
          message: data.message || 'Tiempo de espera agotado: no se pudo contactar a la terminal Clip.'
        };
      }
      if (response.status === 409 || data.error === 'TERMINAL_BUSY') {
        return {
          success: false,
          errorType: 'TERMINAL_BUSY',
          message: data.message || 'La terminal Clip está ocupada con otra transacción.'
        };
      }

      return {
        success: false,
        errorType: data.error || 'ERROR_PETICION',
        message: data.message || `Error del servidor Clip (${response.status})`
      };
    }

    return {
      success: true,
      pinpadRequestId: data.pinpad_request_id || data.id,
      isMock: Boolean(data.is_mock)
    };

  } catch (err: any) {
    console.warn('Fallo de red al conectar con Netlify Function:', err);
    // Si la función de Netlify no responde (ej. en desarrollo local sin netlify dev),
    // detectamos si es un error de conexión de red
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
  maxAttempts: number = 30 // 30 intentos * 2.5s = ~75 segundos de espera para que el cliente pase la tarjeta
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
