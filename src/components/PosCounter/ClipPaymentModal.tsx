import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone
} from 'lucide-react';
import { 
  getStoredClipConfig, 
  saveClipConfig, 
  sendPaymentToClipTerminal, 
  pollClipPaymentStatus, 
  ClipPaymentResult 
} from '../../services/clipService';

interface ClipPaymentModalProps {
  isOpen: boolean;
  amount: number;
  folio: string;
  customerName?: string;
  onClose: () => void;
  onPaymentApproved: (details: {
    terminal: 'clip';
    authCode: string;
    last4?: string;
    reference?: string;
  }) => void;
}

type PaymentStep = 
  | 'INITIATING'        // Enviando a la terminal
  | 'AWAITING_CARD'     // Esperando que el cliente pase la tarjeta en la terminal
  | 'APPROVED'          // Aprobado
  | 'OFFLINE_ERROR'     // Terminal apagada o sin señal Wi-Fi
  | 'TIMEOUT_ERROR'     // Tiempo agotado
  | 'BUSY_ERROR'        // Terminal ocupada
  | 'MANUAL_AUTH';      // Fallback de autorización manual

export const ClipPaymentModal: React.FC<ClipPaymentModalProps> = ({
  isOpen,
  amount,
  folio,
  customerName,
  onClose,
  onPaymentApproved
}) => {
  const [step, setStep] = useState<PaymentStep>('INITIATING');
  const [statusMessage, setStatusMessage] = useState<string>('Conectando con la terminal Clip...');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [last4, setLast4] = useState<string>('');
  const [isEditingSerial, setIsEditingSerial] = useState<boolean>(false);
  const [serialInput, setSerialInput] = useState<string>('');
  const [config, setConfig] = useState(getStoredClipConfig());
  const [isMockSimulation, setIsMockSimulation] = useState<boolean>(false);

  // Fallback manual inputs
  const [manualAuthCode, setManualAuthCode] = useState<string>('');
  const [manualLast4, setManualLast4] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Inicializar y lanzar el cobro automático al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    const stored = getStoredClipConfig();
    setConfig(stored);
    setSerialInput(stored.serialNumber);
    startClipTransaction();

    return () => {
      // Abortar peticiones activas si el usuario cierra el modal
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  const startClipTransaction = async () => {
    // Cancelar cualquier proceso previo
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStep('INITIATING');
    setStatusMessage('Enviando monto a la terminal Clip por Wi-Fi...');
    setErrorMessage('');

    const sendRes = await sendPaymentToClipTerminal(amount, folio);

    if (!sendRes.success) {
      if (sendRes.errorType === 'TERMINAL_OFFLINE') {
        setStep('OFFLINE_ERROR');
        setErrorMessage(
          sendRes.message || 'La terminal Clip está apagada, en reposo o sin señal Wi-Fi.'
        );
      } else if (sendRes.errorType === 'TERMINAL_BUSY') {
        setStep('BUSY_ERROR');
        setErrorMessage(
          sendRes.message || 'La terminal Clip está ocupada con otra transacción.'
        );
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(
          sendRes.message || 'No fue posible contactar a la terminal Clip.'
        );
      }
      return;
    }

    setIsMockSimulation(Boolean(sendRes.isMock));
    setStep('AWAITING_CARD');
    setStatusMessage('Esperando que el cliente acerque, inserte o deslice su tarjeta...');

    // Iniciar sondeo (polling) del estado en la terminal
    const pollRes: ClipPaymentResult = await pollClipPaymentStatus(
      sendRes.pinpadRequestId || 'req_auto',
      (msg) => setStatusMessage(msg),
      controller.signal
    );

    if (pollRes.success && pollRes.status === 'APPROVED') {
      const generatedAuth = pollRes.authCode || 'CLIP-' + Math.floor(100000 + Math.random() * 900000);
      const generatedLast4 = pollRes.last4 || '••••';
      setAuthCode(generatedAuth);
      setLast4(generatedLast4);
      setStep('APPROVED');

      // Esperar 1.2 segundos para mostrar la confirmación visual y completar la venta
      setTimeout(() => {
        onPaymentApproved({
          terminal: 'clip',
          authCode: generatedAuth,
          last4: generatedLast4,
          reference: folio
        });
      }, 1200);
    } else {
      if (pollRes.errorType === 'CANCELLED') {
        // Cancelado intencionalmente
        return;
      }
      if (pollRes.errorType === 'TERMINAL_TIMEOUT' || pollRes.status === 'TIMEOUT') {
        setStep('TIMEOUT_ERROR');
        setErrorMessage(pollRes.message || 'Tiempo agotado sin respuesta del cliente.');
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(pollRes.message || 'La operación no pudo completarse en la terminal.');
      }
    }
  };

  const handleSaveSerial = () => {
    if (!serialInput.trim()) return;
    saveClipConfig({ serialNumber: serialInput.trim() });
    setConfig(getStoredClipConfig());
    setIsEditingSerial(false);
    startClipTransaction();
  };

  const handleManualAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAuth = manualAuthCode.trim() || 'CLIP-MAN-' + Math.floor(100000 + Math.random() * 900000);
    const finalLast4 = manualLast4.trim() || '••••';

    setAuthCode(finalAuth);
    setLast4(finalLast4);
    setStep('APPROVED');

    setTimeout(() => {
      onPaymentApproved({
        terminal: 'clip',
        authCode: finalAuth,
        last4: finalLast4,
        reference: folio
      });
    }, 600);
  };

  // Simulación rápida para pruebas en mostrador cuando se usa modo demo
  const handleForceApproveDemo = () => {
    const demoAuth = 'CLIP-' + Math.floor(100000 + Math.random() * 900000);
    const demoLast4 = '5492';
    setAuthCode(demoAuth);
    setLast4(demoLast4);
    setStep('APPROVED');

    setTimeout(() => {
      onPaymentApproved({
        terminal: 'clip',
        authCode: demoAuth,
        last4: demoLast4,
        reference: folio
      });
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border-2 border-orange-500/20 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#FF5A00] to-[#E04D00] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold shadow-inner">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight leading-none">Terminal Clip Wi-Fi</h3>
                <span className="bg-white/25 text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full tracking-wider">
                  Automático
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                {config.terminalName || 'Clip Stand / Pro / Total'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/30 flex items-center justify-center transition-colors cursor-pointer text-white"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Resumen del Monto a Cobrar */}
        <div className="bg-[#FAF8F6] border-b border-[#E5E1DA] px-5 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
              Folio {folio} {customerName ? `• ${customerName}` : ''}
            </span>
            <span className="text-xs font-semibold text-slate-700">Total a cobrar:</span>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              ${amount.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 block">MXN</span>
          </div>
        </div>

        {/* Serial Number / Info de Conexión */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Serie: <strong>{config.serialNumber}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingSerial(!isEditingSerial)}
            className="text-[11px] text-[#FF5A00] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            {isEditingSerial ? 'Cerrar' : 'Cambiar terminal'}
          </button>
        </div>

        {/* Formulario para cambiar número de serie */}
        {isEditingSerial && (
          <div className="p-4 bg-orange-50/70 border-b border-orange-200 text-xs">
            <label className="block font-bold text-slate-800 mb-1">
              Número de Serie de tu Terminal Clip (impreso en la parte trasera):
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Ej. 08221800012345 o N600-XXXXX"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
              <button
                type="button"
                onClick={handleSaveSerial}
                className="bg-[#FF5A00] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-[#E04D00] cursor-pointer"
              >
                Guardar
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Este número identifica tu terminal Clip Wi-Fi en tu cuenta de Clip para mandar el cobro directo.
            </p>
          </div>
        )}

        {/* Contenido Principal según el Estado */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[220px] text-center">

          {/* ESTADO 1: INICIANDO / ENVIANDO A LA TERMINAL */}
          {step === 'INITIATING' && (
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
                  <Wifi className="w-8 h-8 text-[#FF5A00]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF5A00] flex items-center justify-center text-white">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">Enviando monto a la terminal Clip...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* ESTADO 2: ESPERANDO QUE EL CLIENTE COBRE EN LA TERMINAL CLIP */}
          {step === 'AWAITING_CARD' && (
            <div className="flex flex-col items-center space-y-4 w-full">
              {/* Gráfico interactivo de terminal Clip */}
              <div className="w-20 h-28 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-2 shadow-lg border-2 border-slate-700 flex flex-col justify-between items-center relative overflow-hidden">
                <div className="w-full bg-[#FF5A00] rounded text-[8px] text-white font-black py-0.5 uppercase tracking-wider text-center">
                  CLIP
                </div>
                <div className="bg-slate-950 w-full rounded p-1 text-center font-mono text-[10px] text-emerald-400 font-bold">
                  ${amount.toFixed(2)}
                </div>
                {/* Animación de tarjeta acercándose */}
                <div className="w-12 h-6 bg-gradient-to-r from-amber-400 to-amber-500 rounded-sm shadow-md animate-bounce flex items-center justify-center text-[7px] font-black text-slate-900">
                  TARJETA
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg">Pasa la tarjeta en la terminal</h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs">
                  {statusMessage}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Terminal activa • Esperando NIP / Tarjeta
                </div>
              </div>

              {/* Botón de aprobación rápida para pruebas/demo si se detecta modo simulación */}
              {isMockSimulation && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleForceApproveDemo}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Aprobar Pago (Simulación de Prueba)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 3: PAGO APROBADO EXITOSAMENTE */}
          {step === 'APPROVED' && (
            <div className="flex flex-col items-center space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-black text-emerald-700 text-xl">¡Pago Aprobado!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Autorización: <strong className="font-mono">{authCode}</strong>
                </p>
                {last4 && (
                  <p className="text-xs text-slate-500">
                    Tarjeta terminación: <strong className="font-mono">**** {last4}</strong>
                  </p>
                )}
                <span className="text-[11px] text-emerald-600 font-bold block mt-2 animate-pulse">
                  Generando ticket e imprimiendo comprobante...
                </span>
              </div>
            </div>
          )}

          {/* ESTADO 4: ERROR - TERMINAL APAGADA O SIN SEÑAL WI-FI */}
          {step === 'OFFLINE_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <WifiOff className="w-8 h-8 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-red-700 text-base">Terminal Clip Apagada o Sin Señal</h4>
                <p className="text-xs text-slate-600 px-2 leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              {/* Sugerencias prácticas para la cajera */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-900 w-full space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pasos para solucionar:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                  <li>Verifica que la terminal Clip esté <strong>encendida</strong> con pantalla activa.</li>
                  <li>Revisa que el ícono de <strong>Wi-Fi</strong> en la terminal esté conectado.</li>
                  <li>Confirma que el número de serie configurado coincida con tu dispositivo.</li>
                </ul>
              </div>

              {/* Opciones de Acción */}
              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startClipTransaction}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>

                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Autorizar Manual
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 5: TIMEOUT */}
          {step === 'TIMEOUT_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Tiempo de Espera Agotado</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">{errorMessage}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startClipTransaction}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar Cobro
                </button>
                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  Autorizar Manual
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 6: AUTORIZACIÓN MANUAL DE RESPALDO */}
          {step === 'MANUAL_AUTH' && (
            <form onSubmit={handleManualAuthSubmit} className="w-full text-left space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  Respaldo: ¿Cobraste directo en la terminal?
                </span>
                <p className="text-[11px] text-slate-600">
                  Si pasaste la tarjeta directamente en la terminal Clip y se imprimió el comprobante, ingresa el número de autorización para cerrar la venta:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Autorización / Aprobación (ej. 123456):
                </label>
                <input
                  type="text"
                  required
                  value={manualAuthCode}
                  onChange={(e) => setManualAuthCode(e.target.value)}
                  placeholder="Ej. 654321"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Últimos 4 dígitos de la tarjeta (Opcional):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={manualLast4}
                  onChange={(e) => setManualLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 1234"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('OFFLINE_ERROR')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Confirmar Cobro
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Clip Pay API • Conexión Wi-Fi Segura
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer hover:underline"
          >
            Cancelar operación
          </button>
        </div>

      </div>
    </div>
  );
};
