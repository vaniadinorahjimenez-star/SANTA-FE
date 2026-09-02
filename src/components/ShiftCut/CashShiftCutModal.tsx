import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Printer, 
  MessageCircle, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  TrendingDown, 
  Coins, 
  Banknote, 
  Receipt, 
  Sparkles, 
  AlertCircle,
  FileSpreadsheet,
  Check,
  Calculator,
  Eye,
  ArrowDownCircle,
  Building2,
  CreditCard,
  Wheat,
  Coffee,
  RotateCcw
} from 'lucide-react';
import { SaleTicket, Settings, CashOutflowItem, ShiftCutRecord } from '../../types';
import { 
  getTodayString, 
  getNowTimeString, 
  getNextShiftCutFolio, 
  saveShiftCuts, 
  loadShiftCuts, 
  loadOutflows, 
  saveOutflows, 
  generateShiftCutWhatsAppMessage,
  resolveTicketShift 
} from '../../utils/storage';
import { playBeep, playCashSound, playCelebrationFanfare } from '../../utils/audio';
import { ThermalShiftCutTicket } from './ThermalShiftCutTicket';
import { calculateTicketsBreakdown } from '../../utils/productClassification';

interface CashShiftCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: SaleTicket[];
  settings: Settings;
  onCutSaved?: (cut: ShiftCutRecord) => void;
}

const CASHIER_PRESETS = ['Paty', 'Mari', 'Jonathan', 'Natty'];

const COMMON_EXPENSE_PRESETS = [
  { label: '🚗 Uber / Transporte', concept: 'Uber / Transporte' },
  { label: '💸 Préstamos', concept: 'Préstamos' },
  { label: '🥛 Alpura', concept: 'Alpura' },
  { label: '🥤 Coca cola', concept: 'Coca cola' },
  { label: '🔧 Mantenimientos', concept: 'Mantenimientos' },
  { label: '🐷 Ahorro', concept: 'Ahorro' },
  { label: '🥪 Desayuno', concept: 'Desayuno' },
  { label: '📦 Otros', concept: 'Otros' },
  { label: '🌾 Harinera', concept: 'Pago Harina / Harinera' },
  { label: '🔥 Gas L.P.', concept: 'Pago Gas L.P.' },
  { label: '🥚 Proveedor Huevo', concept: 'Pago Proveedor Huevo' },
  { label: '🛍️ Bolsas y Domos', concept: 'Bolsas y Domos' }
];

export const CashShiftCutModal: React.FC<CashShiftCutModalProps> = ({
  isOpen,
  onClose,
  tickets,
  settings,
  onCutSaved
}) => {
  // Current Date and Automatic Real-Time Clock
  const todayStr = getTodayString();
  const [autoTime, setAutoTime] = useState<string>(getNowTimeString());
  const [autoDateFormatted, setAutoDateFormatted] = useState<string>('');

  // Cashier / Person Name (persisted in localStorage or empty if previous was generic)
  const [cashierName, setCashierName] = useState<string>(() => {
    const saved = localStorage.getItem('santafe_last_cashier_name');
    if (saved && saved !== 'Mostrador Principal') return saved;
    return '';
  });

  // Shift Name (Prioridad: lee el turno activo en mostrador, o detecta por horario: antes de 15:00 = Turno 1, >= 15:00 = Turno 2)
  const [shiftType, setShiftType] = useState<string>(() => {
    const active = localStorage.getItem('santafe_active_shift');
    if (active === 'turno1') return 'Turno 1 (Mañana 07:00 a 15:00)';
    if (active === 'turno2') return 'Turno 2 (Tarde 15:00 a 22:00)';
    const hour = new Date().getHours();
    return hour < 15 ? 'Turno 1 (Mañana 07:00 a 15:00)' : 'Turno 2 (Tarde 15:00 a 22:00)';
  });

  // Initial Drawer Cash (Fondo inicial de caja) - Default 1000 editable con persistencia
  const [initialCash, setInitialCash] = useState<number>(() => {
    const saved = localStorage.getItem('santafe_initial_cash_pref');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 1000;
  });

  const handleUpdateInitialCash = (newVal: number) => {
    const safe = Math.max(0, newVal);
    setInitialCash(safe);
    localStorage.setItem('santafe_initial_cash_pref', safe.toString());
  };

  // Fondo que se deja en caja para el siguiente turno - Default 1000 editable con persistencia
  const [nextShiftCash, setNextShiftCash] = useState<number>(() => {
    const saved = localStorage.getItem('santafe_next_shift_cash_pref');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 1000;
  });

  const handleUpdateNextShiftCash = (newVal: number) => {
    const safe = Math.max(0, newVal);
    setNextShiftCash(safe);
    localStorage.setItem('santafe_next_shift_cash_pref', safe.toString());
  };

  // Outflows / Salidas de dinero / Pagos a proveedores
  const [outflows, setOutflows] = useState<CashOutflowItem[]>(() => {
    return loadOutflows();
  });

  // New Outflow Input Form
  const [newConcept, setNewConcept] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newRecipient, setNewRecipient] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [showAddOutflowForm, setShowAddOutflowForm] = useState<boolean>(false);

  // Cash Count / Arqueo (Optional breakdown)
  const [showCashBreakdown, setShowCashBreakdown] = useState<boolean>(false);
  const [cashDenominations, setCashDenominations] = useState<{ [denom: number]: number }>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0
  });

  // Observations / Notes
  const [notes, setNotes] = useState<string>('');

  // Success Notice & Thermal Preview Ticket state
  const [savedCutFolio, setSavedCutFolio] = useState<string | null>(null);
  const [previewCutRecord, setPreviewCutRecord] = useState<ShiftCutRecord | null>(null);

  // Live auto clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setAutoTime(now.toTimeString().slice(0, 5));
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setAutoDateFormatted(now.toLocaleDateString('es-MX', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Save cashier name changes
  useEffect(() => {
    if (cashierName.trim()) {
      localStorage.setItem('santafe_last_cashier_name', cashierName.trim());
    }
  }, [cashierName]);

  // Persist outflows
  useEffect(() => {
    saveOutflows(outflows);
  }, [outflows]);

  // Filter tickets for today (all tickets for day)
  const allTodayTickets = useMemo(() => {
    return tickets.filter(t => t.date === todayStr);
  }, [tickets, todayStr]);

  // Counts of tickets per shift for today
  const turno1TicketsCount = useMemo(() => {
    return allTodayTickets.filter(t => resolveTicketShift(t) === 'turno1').length;
  }, [allTodayTickets]);

  const turno2TicketsCount = useMemo(() => {
    return allTodayTickets.filter(t => resolveTicketShift(t) === 'turno2').length;
  }, [allTodayTickets]);

  // Filter tickets specifically for the selected shift to cut
  const todayTickets = useMemo(() => {
    return allTodayTickets.filter(t => {
      if (shiftType.includes('Completo')) return true;
      const targetShiftCode = shiftType.includes('Turno 1') ? 'turno1' : 'turno2';
      return resolveTicketShift(t) === targetShiftCode;
    });
  }, [allTodayTickets, shiftType]);

  // Total gross sales
  const totalGrossSales = useMemo(() => {
    return todayTickets.reduce((sum, t) => sum + t.total, 0);
  }, [todayTickets]);

  // Card sales detected automatically from tickets
  const autoCardSales = useMemo(() => {
    return todayTickets
      .filter(t => t.paymentMethod === 'tarjeta')
      .reduce((sum, t) => sum + t.total, 0);
  }, [todayTickets]);

  // Manual card override state
  const [manualCardInput, setManualCardInput] = useState<string>('');
  const [isManualCardActive, setIsManualCardActive] = useState<boolean>(false);

  // Sync initial manualCardInput from autoCardSales if not actively overridden
  useEffect(() => {
    if (!isManualCardActive) {
      setManualCardInput(autoCardSales > 0 ? autoCardSales.toString() : '0');
    }
  }, [autoCardSales, isManualCardActive]);

  // Effective card sales
  const effectiveCardSales = useMemo(() => {
    if (isManualCardActive) {
      const parsed = parseFloat(manualCardInput);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return autoCardSales;
  }, [isManualCardActive, manualCardInput, autoCardSales]);

  // Cuadre inmediato de Efectivo:
  // Efectivo = Total Bruto - Ventas con Tarjeta
  const effectiveCashSales = useMemo(() => {
    return Math.max(0, totalGrossSales - effectiveCardSales);
  }, [totalGrossSales, effectiveCardSales]);

  // Total pieces
  const totalPieces = useMemo(() => {
    return todayTickets.reduce((sum, t) => {
      return sum + t.items.reduce((s, it) => s + it.quantity, 0);
    }, 0);
  }, [todayTickets]);

  // Desglose Pan vs No Pan (Otros) con lista itemizada de productos no pan registrados
  const { breadTotal, nonBreadTotal, breadPieces, nonBreadPieces, nonBreadItemsList } = useMemo(() => {
    return calculateTicketsBreakdown(todayTickets);
  }, [todayTickets]);

  // Outflows total sum
  const totalOutflows = useMemo(() => {
    return outflows.reduce((sum, o) => sum + o.amount, 0);
  }, [outflows]);

  // Expected Cash in Drawer = Initial Cash + Effective Cash Sales - Total Outflows
  const expectedCashInDrawer = useMemo(() => {
    return (initialCash || 0) + effectiveCashSales - totalOutflows;
  }, [initialCash, effectiveCashSales, totalOutflows]);

  // Cash to Deliver = Expected Cash in Drawer - Next Shift Cash (amount left in drawer for next shift)
  const cashToDeliver = useMemo(() => {
    return Math.max(0, expectedCashInDrawer - (nextShiftCash || 0));
  }, [expectedCashInDrawer, nextShiftCash]);

  // Counted Cash
  const actualCashCounted = useMemo(() => {
    return Object.entries(cashDenominations).reduce((sum, [denom, count]) => {
      const countNum = typeof count === 'number' ? count : Number(count || 0);
      return sum + (Number(denom) * countNum);
    }, 0);
  }, [cashDenominations]);

  const cashDifference = actualCashCounted > 0 ? actualCashCounted - expectedCashInDrawer : 0;
  const actualCashToDeliver = actualCashCounted > 0 ? Math.max(0, actualCashCounted - (nextShiftCash || 0)) : 0;

  // Add Outflow Handler
  const handleAddOutflow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (!newConcept.trim() || isNaN(amountNum) || amountNum <= 0) {
      playBeep(250, 'sawtooth', 0.15);
      return;
    }

    playCashSound();

    const newOutflowItem: CashOutflowItem = {
      id: `outflow-${Date.now()}`,
      concept: newConcept.trim(),
      amount: Math.round(amountNum),
      time: getNowTimeString(),
      recipient: newRecipient.trim() || undefined,
      notes: newNotes.trim() || undefined
    };

    setOutflows(prev => [newOutflowItem, ...prev]);
    setNewConcept('');
    setNewAmount('');
    setNewRecipient('');
    setNewNotes('');
    setShowAddOutflowForm(false);
  };

  // Remove Outflow Handler
  const handleRemoveOutflow = (id: string) => {
    playBeep(400, 'sine', 0.08);
    setOutflows(prev => prev.filter(o => o.id !== id));
  };

  // Build current shift cut record
  const getCurrentCutRecord = (folioStr?: string): ShiftCutRecord => {
    return {
      id: `cut-${Date.now()}`,
      folio: folioStr || savedCutFolio || 'CORTE-PREVIO',
      date: todayStr,
      time: autoTime,
      cashierName: cashierName.trim() || 'Sin asignar',
      shiftName: shiftType,
      initialCash,
      totalGrossSales,
      totalCashSales: effectiveCashSales,
      totalCardSales: effectiveCardSales,
      isCardManualOverride: isManualCardActive,
      totalBreadSales: breadTotal,
      totalNonBreadSales: nonBreadTotal,
      breadPieces,
      nonBreadPieces,
      nonBreadItems: nonBreadItemsList,
      totalPieces,
      ticketsCount: todayTickets.length,
      outflows,
      totalOutflows,
      expectedCashInDrawer,
      nextShiftCash,
      cashToDeliver,
      actualCashInDrawer: actualCashCounted > 0 ? actualCashCounted : undefined,
      difference: actualCashCounted > 0 ? cashDifference : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };
  };

  // Ver Previo del Ticket de Corte
  const handleOpenPreview = () => {
    playBeep(650, 'sine', 0.04);
    const cutRecord = getCurrentCutRecord();
    setPreviewCutRecord(cutRecord);
  };

  // Guardar y abrir diálogo de impresión real
  const handleSaveAndPrintCut = (printImmediately: boolean = true) => {
    const folio = getNextShiftCutFolio();
    const newCut = getCurrentCutRecord(folio);

    // Save cut in historical records
    const existingCuts = loadShiftCuts();
    saveShiftCuts([newCut, ...existingCuts]);

    if (onCutSaved) {
      onCutSaved(newCut);
    }

    playCelebrationFanfare();
    setSavedCutFolio(folio);
    setPreviewCutRecord(newCut);

    if (printImmediately) {
      setTimeout(() => {
        window.print();
      }, 350);
    }
  };

  // Share via WhatsApp
  const handleSendWhatsApp = () => {
    const dummyCut = getCurrentCutRecord();
    const encoded = generateShiftCutWhatsAppMessage(dummyCut, settings);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        id="shift-cut-modal-overlay"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      >
        <div 
          id="shift-cut-modal-container"
          className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-amber-300 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2D3142] via-slate-800 to-[#2D3142] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Corte de Caja / Turno
                  </h2>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Santa Fé
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 font-medium">
                  Panadería Santa Fé el refugio • Balance, Tarjetas y Salidas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
            {/* Section 1: Cashier Selector & Auto-Timestamp */}
            <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cashier Selection */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#D95D39]" />
                      <span>Encargado / Cajero(a):</span>
                    </span>
                    {cashierName && (
                      <span className="text-[10px] text-amber-900 font-bold">
                        {cashierName}
                      </span>
                    )}
                  </label>

                  {/* Fast Selector Buttons for Personnel */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {CASHIER_PRESETS.map((name) => {
                      const isSelected = cashierName === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          id={`cashier-btn-${name.toLowerCase()}`}
                          onClick={() => {
                            setCashierName(name);
                            playBeep(600, 'sine', 0.03);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/50'
                              : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-200'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    id="shift-cashier-name-input"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder="O escribe el nombre manualmente..."
                    className="w-full bg-white px-3.5 py-2 rounded-xl font-bold text-xs text-slate-900 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-[#D95D39] shadow-xs"
                  />
                </div>

                {/* Shift Selection with Quick Shift Switch Buttons */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#D95D39]" />
                      <span>Turno a Cortar:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      Hora actual: {autoTime}
                    </span>
                  </label>

                  {/* Switch rápido de turnos con conteo de tickets */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setShiftType('Turno 1 (Mañana 07:00 a 15:00)')}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border-2 flex flex-col justify-between ${
                        shiftType.includes('Turno 1')
                          ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border-amber-200'
                      }`}
                    >
                      <div className="font-black text-xs flex items-center gap-1">
                        <span>🌅</span>
                        <span>Turno 1</span>
                      </div>
                      <div className="text-[10px] font-bold opacity-80 mt-0.5">
                        {turno1TicketsCount} tickets
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftType('Turno 2 (Tarde 15:00 a 22:00)')}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border-2 flex flex-col justify-between ${
                        shiftType.includes('Turno 2')
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-400/50'
                          : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-black text-xs flex items-center gap-1">
                        <span>🌇</span>
                        <span>Turno 2</span>
                      </div>
                      <div className="text-[10px] font-bold opacity-80 mt-0.5">
                        {turno2TicketsCount} tickets
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftType('Turno Completo')}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border-2 flex flex-col justify-between ${
                        shiftType.includes('Completo')
                          ? 'bg-slate-800 text-white border-slate-900 shadow-xs ring-2 ring-slate-400/50'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-black text-xs flex items-center gap-1">
                        <span>🗓️</span>
                        <span>Todo el Día</span>
                      </div>
                      <div className="text-[10px] font-bold opacity-80 mt-0.5">
                        {allTodayTickets.length} tickets
                      </div>
                    </button>
                  </div>

                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full bg-white px-3 py-1.5 rounded-xl font-bold text-xs text-slate-900 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-[#D95D39] shadow-2xs cursor-pointer"
                  >
                    <option value="Turno 1 (Mañana 07:00 a 15:00)">🌅 Turno 1 (Mañana 07:00 a 15:00)</option>
                    <option value="Turno 2 (Tarde 15:00 a 22:00)">🌇 Turno 2 (Tarde 15:00 a 22:00)</option>
                    <option value="Turno Completo">🗓️ Turno Completo (Día)</option>
                  </select>
                </div>
              </div>

              {/* Auto Time & Date Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-bold capitalize">{autoDateFormatted || todayStr}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-200/80 text-amber-950 font-black px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-[#D95D39] animate-pulse" />
                  <span>Hora Auto-Registrada: {autoTime}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Sales Summary Grid & Manual Card / Cash Auto-Square */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Resumen de Ventas y Cuadre de Cobros (Hoy)</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-bold">
                  {todayTickets.length} tickets emitidos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Total Bruto */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Ventas Bruto</span>
                  <span className="text-xl font-black text-slate-900">${totalGrossSales}.00</span>
                  <span className="text-[10px] text-slate-500 block">{totalPieces} pzs totales</span>
                </div>

                {/* Tarjeta - Con entrada manual directa */}
                <div className={`rounded-2xl p-3 border transition-all ${
                  isManualCardActive ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300/60' : 'bg-blue-50/70 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">
                      💳 Pago Tarjeta
                    </span>
                    {isManualCardActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualCardActive(false);
                          setManualCardInput(autoCardSales.toString());
                        }}
                        title="Restablecer a tickets"
                        className="text-[9px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5 bg-blue-200/70 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Auto</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-1 flex items-center">
                    <span className="text-sm font-black text-blue-800 mr-1">$</span>
                    <input
                      type="number"
                      id="shift-manual-card-input"
                      step="1"
                      min="0"
                      value={isManualCardActive ? manualCardInput : effectiveCardSales}
                      onChange={(e) => {
                        setIsManualCardActive(true);
                        setManualCardInput(e.target.value);
                      }}
                      placeholder="0"
                      className="w-full bg-white px-2 py-1 rounded-lg text-lg font-black text-blue-700 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <span className="text-[9.5px] text-blue-800 font-medium block mt-1">
                    {isManualCardActive ? '✏️ Monto Manual (Terminal)' : 'Ingresa monto si terminal no conecta'}
                  </span>
                </div>

                {/* Efectivo Cobrado (Cuadrado de inmediato) */}
                <div className="bg-emerald-50/90 rounded-2xl p-3 border border-emerald-300 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                      💵 Efectivo Cobrado
                    </span>
                    <span className="text-[9px] bg-emerald-200 text-emerald-950 font-black px-1.5 py-0.2 rounded">
                      Cuadre Auto
                    </span>
                  </div>
                  <span className="text-xl font-black text-emerald-700 block mt-1">
                    ${effectiveCashSales}.00
                  </span>
                  <span className="text-[9.5px] text-emerald-800 font-medium block">
                    (Total - Tarjeta = Efectivo)
                  </span>
                </div>

                {/* Total Piezas */}
                <div className="bg-amber-50/80 rounded-2xl p-3 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">🥖 Piezas / Arts</span>
                  <span className="text-xl font-black text-[#D95D39] block mt-1">{totalPieces}</span>
                  <span className="text-[10px] text-amber-700 block">Total artículos</span>
                </div>
              </div>

              {/* Desglose Venta de Pan vs Venta de Otros (No Pan) */}
              <div className="bg-gradient-to-r from-amber-100/60 via-white to-blue-50/60 rounded-2xl p-3.5 border border-amber-300/80 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-amber-700" />
                    <span>Desglose: Venta de Pan vs Venta de Otros (No Pan)</span>
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded-full">
                    Mostrador Hoy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Card Venta de Pan */}
                  <div className="bg-white rounded-xl p-2.5 border-2 border-amber-300 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-sm">
                        🍞
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">Venta de Pan</div>
                        <div className="text-[10px] text-slate-500 font-bold">{breadPieces} piezas vendidas</div>
                      </div>
                    </div>
                    <div className="text-base font-black text-amber-900 font-mono">
                      ${breadTotal}.00
                    </div>
                  </div>

                  {/* Card Venta de Otros (No Pan) */}
                  <div className="bg-white rounded-xl p-2.5 border-2 border-blue-300 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                        🥛
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">Otros (No es Pan)</div>
                        <div className="text-[10px] text-slate-500 font-bold">{nonBreadPieces} arts (Lácteos, paletas, bebidas...)</div>
                      </div>
                    </div>
                    <div className="text-base font-black text-blue-900 font-mono">
                      ${nonBreadTotal}.00
                    </div>
                  </div>
                </div>

                {/* Listado Desglosado de Productos No-Pan Registrados (ej. Paletas, Quesos, Leche, etc.) */}
                {nonBreadItemsList && nonBreadItemsList.length > 0 ? (
                  <div className="mt-3 bg-white/90 rounded-xl p-2.5 border border-blue-200">
                    <div className="text-[11px] font-black text-blue-950 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>🍦</span>
                        <span>Desglose Detallado de No-Pan ({nonBreadItemsList.length} productos registrados):</span>
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded">
                        Se incluye en Ticket de Corte
                      </span>
                    </div>
                    <div className="divide-y divide-blue-100 max-h-36 overflow-y-auto pr-1">
                      {nonBreadItemsList.map((item, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 font-bold bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                              {item.quantity} {item.quantity === 1 ? 'pza' : 'pzas'}
                            </span>
                            <span className="font-black text-blue-900 font-mono text-xs min-w-[50px] text-right">
                              ${item.total}.00
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-slate-500 italic bg-white/50 px-2 py-1 rounded-lg border border-dashed border-slate-300">
                    * No se registraron artículos no-pan (paletas, quesos, leche, etc.) en los tickets de este turno.
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: SALIDAS / PAGOS A PROVEEDORES DESGLOSADAS */}
            <div className="bg-rose-50/70 rounded-2xl p-4 border-2 border-rose-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-rose-950 flex items-center gap-1.5">
                      <span>Salidas de Dinero / Pagos a Proveedores</span>
                      <span className="bg-rose-600 text-white text-[10px] px-2 py-0.2 rounded-full">Desglosado</span>
                    </h3>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Se descuentan automáticamente del efectivo en caja y se imprimen en el corte
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-add-outflow-btn"
                  onClick={() => setShowAddOutflowForm(prev => !prev)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddOutflowForm ? 'Cerrar Formulario' : '+ Agregar Salida'}</span>
                </button>
              </div>

              {/* Quick Preset Buttons for common bakery expenses (Uber/Transporte, Prestamos, Alpura, Coca cola, Mantenimientos, Ahorro, Desayuno, otros) */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-900">
                  Botones Rápidos de Proveedores / Salidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EXPENSE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewConcept(preset.concept);
                        setShowAddOutflowForm(true);
                        playBeep(520, 'sine', 0.04);
                      }}
                      className="bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold py-1 px-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Outflow Form */}
              {showAddOutflowForm && (
                <form onSubmit={handleAddOutflow} className="bg-white rounded-2xl p-3.5 border border-rose-300 space-y-2.5 shadow-sm animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                        Concepto / Proveedor: *
                      </label>
                      <input
                        type="text"
                        id="outflow-concept-input"
                        placeholder="Ej. Alpura, Coca cola, Uber..."
                        value={newConcept}
                        onChange={(e) => setNewConcept(e.target.value)}
                        required
                        className="w-full bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                        Monto a Descontar ($): *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="1"
                          id="outflow-amount-input"
                          placeholder="0.00"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          required
                          className="w-full pl-7 pr-3 py-2 rounded-xl text-xs font-black text-rose-700 bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Entregado a / Recibió (Ej. Chofer, Paty...)"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Nota adicional o # de folio/remisión"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddOutflowForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="save-outflow-btn"
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar y Descontar</span>
                    </button>
                  </div>
                </form>
              )}

              {/* List of Outflows registered (DESGLOSE COMPLETO) */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {outflows.length === 0 ? (
                  <div className="text-center py-3 bg-white/60 rounded-xl border border-rose-100 text-xs text-rose-800/70 italic font-medium">
                    No hay salidas ni pagos a proveedores registrados hoy.
                  </div>
                ) : (
                  outflows.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-2.5 border border-rose-200 flex items-center justify-between gap-2 shadow-2xs hover:border-rose-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 leading-tight">
                            {item.concept}
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                            <span>🕒 {item.time}</span>
                            {item.recipient && <span className="text-slate-700 font-semibold">👤 {item.recipient}</span>}
                            {item.notes && <span className="text-slate-600 italic">📝 {item.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-rose-700 font-mono">
                          -${item.amount}.00
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOutflow(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Eliminar salida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal Outflows Banner */}
              {outflows.length > 0 && (
                <div className="bg-rose-100/90 text-rose-950 p-2.5 rounded-xl flex items-center justify-between text-xs font-black border border-rose-300">
                  <span>Total Salidas / Pagos Proveedores ({outflows.length}):</span>
                  <span className="text-sm text-rose-700 font-mono font-black">-${totalOutflows}.00</span>
                </div>
              )}
            </div>

            {/* Section 4: Fondo Inicial, Fondo Siguiente Turno & Balance Matemático Final de Caja */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-emerald-50 rounded-3xl p-4 sm:p-5 border-2 border-amber-300 space-y-4">
              <div className="border-b border-amber-200/80 pb-2.5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#D95D39]" />
                  <span>Balance Final de Efectivo en Caja & Fondos de Turno</span>
                </h3>
                <p className="text-[11px] text-slate-600">
                  Cálculo automático: (Fondo Inicial + Efectivo Cobrado) - Salidas - Fondo para el Siguiente Turno
                </p>
              </div>

              {/* Controles de Fondos: Fondo Inicial Recibido y Fondo que se Deja para Sig. Turno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Fondo Inicial Recibido */}
                <div className="bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Fondo Inicial Recibido:</span>
                      <span className="text-[10px] text-slate-500 font-bold">Con el que inició este turno</span>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300">
                      <span className="text-sm font-black text-amber-600 font-mono">$</span>
                      <input
                        id="initial-cash-input"
                        type="number"
                        step="50"
                        min="0"
                        value={initialCash}
                        onChange={(e) => handleUpdateInitialCash(parseFloat(e.target.value) || 0)}
                        className="w-20 text-sm font-black text-slate-900 focus:outline-none border-b-2 border-amber-500 font-mono text-right bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-400 font-mono">.00</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleUpdateInitialCash(initialCash - 100)}
                      className="px-2 py-1 bg-slate-50 hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-700 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Restar 100"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateInitialCash(initialCash + 100)}
                      className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-emerald-700 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Sumar 100"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateInitialCash(1000)}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Restablecer a $1,000"
                    >
                      $1,000 (Default)
                    </button>
                  </div>
                </div>

                {/* 2. Fondo que se Deja para el Siguiente Turno */}
                <div className="bg-indigo-50/50 p-3 rounded-2xl border-2 border-indigo-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-indigo-950 block">Se Deja para Siguiente Turno:</span>
                      <span className="text-[10px] text-indigo-700 font-bold">Fondo que se queda en cajón para cambio</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-indigo-300">
                      <span className="text-sm font-black text-indigo-600 font-mono">$</span>
                      <input
                        id="next-shift-cash-input"
                        type="number"
                        step="50"
                        min="0"
                        value={nextShiftCash}
                        onChange={(e) => handleUpdateNextShiftCash(parseFloat(e.target.value) || 0)}
                        className="w-20 text-sm font-black text-slate-900 focus:outline-none border-b-2 border-indigo-500 font-mono text-right bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-400 font-mono">.00</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1 justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleUpdateNextShiftCash(nextShiftCash - 100)}
                      className="px-2 py-1 bg-white hover:bg-rose-50 border border-indigo-200 text-rose-700 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Restar 100"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNextShiftCash(nextShiftCash + 100)}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 border border-indigo-200 text-emerald-700 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Sumar 100"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNextShiftCash(1000)}
                      className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 text-indigo-950 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Dejar $1,000 en caja"
                    >
                      $1,000 (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNextShiftCash(500)}
                      className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Dejar $500"
                    >
                      $500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNextShiftCash(0)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black text-[11px] rounded-lg shadow-2xs cursor-pointer active:scale-95"
                      title="Dejar $0 (No dejar fondo)"
                    >
                      $0
                    </button>
                  </div>
                </div>
              </div>

              {/* Math Formula Breakdown */}
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between items-center text-slate-700">
                  <span>(+) Fondo Inicial de Caja (Recibido al abrir):</span>
                  <span className="font-bold font-mono">${initialCash}.00</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800">
                  <span>(+) Total Ventas en Efectivo Hoy (Cuadrado):</span>
                  <span className="font-bold font-mono">+${effectiveCashSales}.00</span>
                </div>
                <div className="flex justify-between items-center text-rose-700">
                  <span>(-) Total Salidas a Proveedores / Gastos:</span>
                  <span className="font-bold font-mono">-${totalOutflows}.00</span>
                </div>
                <div className="flex justify-between items-center text-slate-800 pt-1 border-t border-dashed border-amber-300 font-extrabold">
                  <span>(=) Total Efectivo Físico en Cajón:</span>
                  <span className="font-mono text-sm font-black">${expectedCashInDrawer}.00</span>
                </div>
                <div className="flex justify-between items-center text-indigo-950 font-black bg-indigo-100/70 px-2.5 py-1.5 rounded-xl border border-indigo-200">
                  <span className="flex items-center gap-1.5">
                    <span>(-) Se DEJA en Caja para Siguiente Turno (Descuento):</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded-md">Fondo cambio</span>
                  </span>
                  <span className="font-mono text-sm text-indigo-900 font-black">-${nextShiftCash}.00</span>
                </div>

                {/* Big Result Box */}
                <div className="pt-2 border-t-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-white via-amber-50/50 to-emerald-50 rounded-2xl p-4 shadow-sm border border-amber-300 gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 block">
                      EFECTIVO NETO A RETIRAR / ENTREGAR AL DUEÑO:
                    </span>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      (Dinero que se saca para el sobre o entrega al patrón. En el cajón se quedan <strong className="text-indigo-900 font-mono">${nextShiftCash}.00</strong>)
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-tight">
                      ${cashToDeliver}.00
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Fondo en cajón: ${nextShiftCash}.00
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Optional Arqueo / Cash Denominations Count */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setShowCashBreakdown(prev => !prev)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-700 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>¿Deseas contar billetes y monedas? (Arqueo Opcional)</span>
                </div>
                <span className="text-slate-400 text-xs">{showCashBreakdown ? '▲ Ocultar' : '▼ Mostrar Conteo'}</span>
              </button>

              {showCashBreakdown && (
                <div className="mt-3 space-y-3 pt-2 border-t border-slate-200 animate-in fade-in">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[500, 200, 100, 50, 20, 10, 5, 2, 1].map((denom) => (
                      <div key={denom} className="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-black text-slate-500 block">${denom}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={cashDenominations[denom] || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setCashDenominations(prev => ({ ...prev, [denom]: val }));
                          }}
                          className="w-full text-center text-xs font-black text-slate-900 border border-slate-300 rounded py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  {actualCashCounted > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2 text-xs font-bold">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1 border-b border-slate-100">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Efectivo Contado en Cajón:</span>
                          <strong className="text-slate-900 font-mono text-sm">${actualCashCounted}.00</strong>
                        </div>
                        <div>
                          <span className="text-indigo-600 text-[10px] block">Se Deja para Sig. Turno:</span>
                          <strong className="text-indigo-700 font-mono text-sm">-${nextShiftCash}.00</strong>
                        </div>
                        <div>
                          <span className="text-emerald-700 text-[10px] block">Efectivo Real a Retirar:</span>
                          <strong className="text-emerald-700 font-mono text-sm">${actualCashToDeliver}.00</strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="text-slate-700">Diferencia de Cajón vs Esperado:</span>
                        <strong className={`font-mono text-sm ${cashDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {cashDifference >= 0 ? `+$${cashDifference}.00 (Sobrante)` : `-$${Math.abs(cashDifference)}.00 (Faltante)`}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 6: Observaciones */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                Observaciones / Notas del Turno:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe cualquier detalle del turno (ej. faltó cambio en la mañana, billete roto, etc.)"
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
              />
            </div>
          </div>

          {/* Modal Footer / Action Buttons */}
          <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* WhatsApp Share */}
              <button
                type="button"
                id="shift-whatsapp-btn"
                onClick={handleSendWhatsApp}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>

              {/* Previo Ticket */}
              <button
                type="button"
                id="shift-preview-ticket-btn"
                onClick={handleOpenPreview}
                className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#D95D39]" />
                <span>Ver Previo</span>
              </button>
            </div>

            {/* Print & Save Final Cut Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                id="shift-print-cut-btn"
                onClick={() => handleSaveAndPrintCut(true)}
                className="w-full sm:w-auto bg-[#D95D39] hover:bg-[#b84a2a] text-white font-black text-xs sm:text-sm py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#D95D39]/30 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Guardar e Imprimir Corte</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen / Thermal Ticket Preview Modal */}
      {previewCutRecord && (
        <ThermalShiftCutTicket
          cut={previewCutRecord}
          settings={settings}
          onClose={() => setPreviewCutRecord(null)}
        />
      )}
    </>
  );
};
