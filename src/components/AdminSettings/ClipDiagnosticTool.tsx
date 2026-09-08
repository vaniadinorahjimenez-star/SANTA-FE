import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  KeyRound, 
  Terminal, 
  Server, 
  ShieldCheck, 
  Activity, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { getStoredClipConfig, saveClipConfig, DEFAULT_CLIP_SERIAL } from '../../services/clipService';

interface ClipDiagnosticToolProps {
  initialSerial?: string;
  onConfigUpdated?: () => void;
}

export const ClipDiagnosticTool: React.FC<ClipDiagnosticToolProps> = ({
  initialSerial = DEFAULT_CLIP_SERIAL,
  onConfigUpdated
}) => {
  const [storedConfig, setStoredConfig] = useState(getStoredClipConfig());
  const [serial, setSerial] = useState<string>(storedConfig.serialNumber || initialSerial);
  const [apiKey, setApiKey] = useState<string>(storedConfig.apiKey || '');
  const [secretKey, setSecretKey] = useState<string>(storedConfig.secretKey || '');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'raw' | 'parsed'>('raw');
  
  // Resultados de la prueba
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [rawResponseText, setRawResponseText] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Ejecutar diagnóstico automáticamente la primera vez
  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setErrorDetails(null);
    const startTime = performance.now();

    try {
      const endpoint = '/.netlify/functions/clip-payment';
      const requestPayload = {
        action: 'diagnose',
        serial_number_pos: serial.trim() || DEFAULT_CLIP_SERIAL,
        api_key: apiKey.trim() || undefined,
        secret_key: secretKey.trim() || undefined
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      const elapsed = Math.round(performance.now() - startTime);
      setResponseTimeMs(elapsed);
      setResponseStatus(res.status);
      setLastTestedAt(new Date().toLocaleTimeString());

      const rawText = await res.text();
      setRawResponseText(rawText);

      try {
        const json = JSON.parse(rawText);
        setParsedData(json);
      } catch (e) {
        setParsedData(null);
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTimeMs(elapsed);
      setResponseStatus(0);
      setErrorDetails(err.message || 'Error de red al intentar contactar la función de Netlify.');
      setRawResponseText(JSON.stringify({ error: 'FETCH_FAILED', message: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRaw = () => {
    if (!rawResponseText) return;
    navigator.clipboard.writeText(rawResponseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCredentialsLocally = () => {
    const updated = {
      ...storedConfig,
      serialNumber: serial.trim() || DEFAULT_CLIP_SERIAL,
      apiKey: apiKey.trim() || undefined,
      secretKey: secretKey.trim() || undefined
    };
    saveClipConfig(updated);
    setStoredConfig(updated);
    if (onConfigUpdated) onConfigUpdated();
    alert('Credenciales y número de serie guardados en la configuración de la panadería.');
  };

  const handleResetToDefaultSerial = () => {
    setSerial(DEFAULT_CLIP_SERIAL);
  };

  // Determinar status principal
  const connectionStatus = parsedData?.status || (responseStatus === 200 ? 'SUCCESS' : responseStatus ? `HTTP_${responseStatus}` : 'FAILED');

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          DIAGNOSTICANDO...
        </span>
      );
    }

    if (connectionStatus === 'CONNECTED' || (responseStatus === 200 && parsedData?.clip_http_status === 200)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          API ALCANZABLE & CONECTADA
        </span>
      );
    }

    if (connectionStatus === 'AUTH_FAILED' || parsedData?.clip_http_status === 401) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
          <XCircle className="w-4 h-4 text-red-600" />
          ERROR 401: AUTORIZACIÓN FALLIDA
        </span>
      );
    }

    if (connectionStatus === 'MISSING_CREDENTIALS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          FALTAN CREDENCIALES
        </span>
      );
    }

    if (connectionStatus === 'SERIAL_NOT_FOUND' || parsedData?.is_serial_in_account === false) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300">
          <Smartphone className="w-4 h-4 text-orange-600" />
          SERIE NO REGISTRADA EN LA CUENTA
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
        <Activity className="w-4 h-4 text-slate-600" />
        ESTADO: {connectionStatus}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-200 space-y-6">
      {/* Encabezado de la Herramienta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center text-[#FF5A00] shrink-0">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                Herramienta de Diagnóstico API Clip
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                v1.2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Verifica en tiempo real la alcanzabilidad del endpoint <code className="text-orange-600 font-mono">/.netlify/functions/clip-payment</code> con la acción <code className="text-orange-600 font-mono">diagnose</code> para la terminal <strong>{serial}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            id="run-clip-diagnostic-btn"
            type="button"
            disabled={isLoading}
            onClick={runDiagnostic}
            className="bg-[#FF5A00] hover:bg-[#E04D00] disabled:bg-slate-300 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Consultando API...' : 'Ejecutar Diagnóstico Ahora'}</span>
          </button>
        </div>
      </div>

      {/* Parámetros de la Petición */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            Parámetros enviados a la Netlify Function:
          </span>
          <button
            type="button"
            onClick={handleSaveCredentialsLocally}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Guardar estos valores en la panadería
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Serie */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600">
                serial_number_pos:
              </label>
              <button
                type="button"
                onClick={handleResetToDefaultSerial}
                className="text-[10px] text-blue-600 hover:underline"
                title="Restablecer P8C2240805000156"
              >
                P8C2240805000156
              </button>
            </div>
            <input
              id="diagnostic-serial-input"
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="P8C2240805000156"
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              api_key:
            </label>
            <input
              id="diagnostic-api-key-input"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ej. d8e5e789-xxxx-xxxx"
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              secret_key:
            </label>
            <input
              id="diagnostic-secret-key-input"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Clave secreta de developer.clip.mx"
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas de Conexión */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            Netlify Function
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black font-mono ${responseStatus === 200 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {responseStatus ? `HTTP ${responseStatus}` : 'SIN RESPUESTA'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            /.netlify/functions/clip-payment
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            Clip API Status
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black font-mono ${parsedData?.clip_http_status === 200 ? 'text-emerald-600' : parsedData?.clip_http_status ? 'text-orange-600' : 'text-slate-400'}`}>
              {parsedData?.clip_http_status ? `HTTP ${parsedData.clip_http_status}` : 'N/A'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            api.payclip.io
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            Latencia
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-slate-800">
              {responseTimeMs !== null ? `${responseTimeMs} ms` : '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            Última prueba: {lastTestedAt || 'Pendiente'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            Terminal P8C2240805000156
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-sm font-black ${parsedData?.is_serial_in_account ? 'text-emerald-600' : parsedData?.is_serial_in_account === false ? 'text-amber-600' : 'text-slate-500'}`}>
              {parsedData?.is_serial_in_account === true ? 'En la Cuenta ✅' : parsedData?.is_serial_in_account === false ? 'No Encontrada ⚠️' : 'Pendiente'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-mono">
            {serial}
          </span>
        </div>
      </div>

      {/* Lista de Verificación Rápida */}
      <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
        <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-orange-600" />
          Checklist de Conectividad y Verificación:
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
            {responseStatus === 200 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span><strong>Netlify Function:</strong> {responseStatus === 200 ? 'Respondiendo correctamente (HTTP 200)' : 'Fallo o no encontrada'}</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
            {parsedData?.diagnosis?.has_api_key && parsedData?.diagnosis?.has_secret_key ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : parsedData?.diagnosis?.has_api_key ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>
              <strong>Credenciales:</strong>{' '}
              {parsedData?.diagnosis?.has_api_key && parsedData?.diagnosis?.has_secret_key
                ? 'API Key y Secret Key configuradas'
                : parsedData?.diagnosis?.has_api_key
                ? 'Falta Secret Key (Requerida por Clip)'
                : 'No se detectaron credenciales'}
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
            {parsedData?.clip_http_status === 200 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : parsedData?.clip_http_status === 401 ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>
              <strong>Autenticación en Clip:</strong>{' '}
              {parsedData?.clip_http_status === 200
                ? 'Aceptada (HTTP 200 OK)'
                : parsedData?.clip_http_status === 401
                ? 'Rechazada por Clip (HTTP 401 Unauthorized)'
                : 'Pendiente de prueba'}
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
            {parsedData?.is_serial_in_account ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>
              <strong>Registro de Serie:</strong>{' '}
              {parsedData?.is_serial_in_account
                ? `Terminal ${serial} vinculada a tu cuenta`
                : `Verificar serie ${serial} en app Clip`}
            </span>
          </div>
        </div>
      </div>

      {/* Mensajes y Consejos */}
      {parsedData?.message && (
        <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
          connectionStatus === 'CONNECTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          connectionStatus === 'AUTH_FAILED' ? 'bg-red-50 border-red-200 text-red-900' :
          'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <Activity className="w-4 h-4" />
            <span>Diagnóstico del Servidor:</span>
          </div>
          <p>{parsedData.message}</p>
          {parsedData.advice && (
            <p className="mt-1 font-semibold text-blue-900 bg-blue-50/80 p-2 rounded-xl border border-blue-200">
              💡 {parsedData.advice}
            </p>
          )}
        </div>
      )}

      {/* Visor de Respuesta: RAW JSON vs Interpretado */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView('raw')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeView === 'raw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Response (JSON Crudo)
            </button>
            <button
              type="button"
              onClick={() => setActiveView('parsed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeView === 'parsed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Datos Parseados & Dispositivos
            </button>
          </div>

          <button
            id="copy-raw-response-btn"
            type="button"
            onClick={handleCopyRaw}
            disabled={!rawResponseText}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Raw Response'}</span>
          </button>
        </div>

        {activeView === 'raw' ? (
          <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs font-mono overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span>Respuesta cruda de <span className="text-orange-400">/.netlify/functions/clip-payment</span></span>
              <span>{rawResponseText ? `${rawResponseText.length} bytes` : '0 bytes'}</span>
            </div>
            <pre 
              id="raw-response-viewer"
              className="text-emerald-400 overflow-x-auto max-h-72 text-[11px] leading-relaxed select-all"
            >
              {rawResponseText || (isLoading ? 'Cargando respuesta de la API...' : 'Sin respuesta todavía. Presiona "Ejecutar Diagnóstico Ahora".')}
            </pre>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-700 block mb-1">
                Dispositivos registrados en la cuenta Clip:
              </span>
              {Array.isArray(parsedData?.devices_found) && parsedData.devices_found.length > 0 ? (
                <div className="space-y-1.5">
                  {parsedData.devices_found.map((dev: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                      <div>
                        <strong className="font-mono text-slate-800">
                          {dev.serial_number || dev.serial_number_pos || dev.serialNumber || 'Sin serie'}
                        </strong>
                        <span className="text-slate-400 ml-2">
                          {dev.model || dev.device_type || 'Clip Terminal'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (dev.serial_number || '').toUpperCase() === serial.toUpperCase()
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(dev.serial_number || '').toUpperCase() === serial.toUpperCase() ? 'ESTA TERMINAL' : 'OTRO DISPOSITIVO'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px] italic bg-white p-3 rounded-xl border border-slate-200">
                  {parsedData?.clip_http_status === 200 
                    ? 'Clip respondió HTTP 200 pero la lista de terminales retornada está vacía. Verifica que la terminal física esté activada bajo esta cuenta de desarrollador.'
                    : 'No se pudo obtener la lista de dispositivos debido al estado HTTP de Clip.'}
                </p>
              )}
            </div>

            {parsedData?.diagnosis && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Variables de entorno y entorno de ejecución:
                </span>
                <pre className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                  {JSON.stringify(parsedData.diagnosis, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enlace a developer.clip.mx */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 border-t border-slate-100">
        <span>
          Documentación oficial de Clip: PinPad F2F API v1
        </span>
        <a
          href="https://developer.clip.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FF5A00] font-bold hover:underline inline-flex items-center gap-1"
        >
          <span>Abrir developer.clip.mx</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
