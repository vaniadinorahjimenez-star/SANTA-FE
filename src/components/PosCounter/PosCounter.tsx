import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Trash2, 
  Printer, 
  CreditCard, 
  Banknote, 
  MessageCircle, 
  UserPlus, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Phone, 
  User, 
  Gift, 
  ArrowRight, 
  Coins, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Delete, 
  Check,
  Receipt,
  Bluetooth,
  Radio,
  Calendar,
  FileText,
  Building,
  Clock,
  Send,
  ClipboardList,
  Search,
  Tag,
  Boxes,
  Calculator,
  ShoppingBag
} from 'lucide-react';
import { BreadProduct, TicketItem, SaleTicket, Customer, Settings, ZettleDeviceInfo, BakeryOrder, DriverCustomer } from '../../types';
import { playBeep, playCashSound } from '../../utils/audio';
import { 
  getNextTicketFolio, 
  getNextOrderFolio, 
  getTodayString, 
  getNowTimeString, 
  DEFAULT_DRIVER_CUSTOMERS,
  loadMasterCatalog 
} from '../../utils/storage';
import { 
  REAL_BAKERY_CATALOG, 
  CatalogBreadItem, 
  getProductPriceForCustomer, 
  normalizeCustomerKey 
} from '../../data/bakeryCatalog';
import { 
  connectZettleBluetooth, 
  getZettleConnectionInfo, 
  subscribeZettleConnection 
} from '../../utils/zettleBluetooth';
import { printTicketDirectToPrinter, printOrderTicketDirectToPrinter } from '../../utils/thermalPrinter';
import { ThermalTicket } from '../ThermalTicket';
import { HeartBreadCelebration } from '../HeartBreadCelebration';
import { SmilingCheeseCubileteCelebration } from '../SmilingCheeseCubileteCelebration';
import { CashShiftCutModal } from '../ShiftCut/CashShiftCutModal';
import { ZettleBluetoothModal } from './ZettleBluetoothModal';

interface PosCounterProps {
  products: BreadProduct[];
  settings: Settings;
  customers: Customer[];
  driverCustomers?: DriverCustomer[];
  tickets?: SaleTicket[];
  onSaveTicket: (ticket: SaleTicket, updatedCustomer?: Customer) => void;
  onUpdateTicket?: (ticket: SaleTicket) => void;
  onRegisterCustomer: (customer: Customer) => void;
  onSaveOrder?: (order: BakeryOrder) => void;
}

export const PosCounter: React.FC<PosCounterProps> = ({
  products,
  settings,
  customers,
  driverCustomers = [],
  tickets = [],
  onSaveTicket,
  onUpdateTicket,
  onRegisterCustomer,
  onSaveOrder
}) => {
  // PayPal Zettle Terminal state
  const [showZettleModal, setShowZettleModal] = useState<boolean>(false);
  const [zettleDevice, setZettleDevice] = useState<ZettleDeviceInfo | null>(getZettleConnectionInfo());
  const [isConnectingZettlePos, setIsConnectingZettlePos] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeZettleConnection((info) => {
      setZettleDevice(info);
    });
    return unsub;
  }, []);

  // Shift cut modal state
  const [showShiftCutModal, setShowShiftCutModal] = useState<boolean>(false);

  // Manual Shift Switch (Turno 1 / Turno 2) - Defaults to active shift or by time (< 15:00 = turno1)
  const [activeShift, setActiveShift] = useState<'turno1' | 'turno2'>(() => {
    const saved = localStorage.getItem('santafe_active_shift');
    if (saved === 'turno1' || saved === 'turno2') return saved;
    const hour = new Date().getHours();
    return hour < 15 ? 'turno1' : 'turno2';
  });

  const handleToggleShift = (newShift: 'turno1' | 'turno2') => {
    playBeep(newShift === 'turno1' ? 600 : 750, 'sine', 0.05);
    setActiveShift(newShift);
    localStorage.setItem('santafe_active_shift', newShift);
  };
  
  // Quantity selector state: default 1
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1);
  const [customMultiplierInput, setCustomMultiplierInput] = useState<string>('');
  
  // Touch Numpad Modal state for custom quantities
  const [showNumpadModal, setShowNumpadModal] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');

  // Custom price input
  const [showCustomPriceModal, setShowCustomPriceModal] = useState<boolean>(false);
  const [customPriceVal, setCustomPriceVal] = useState<string>('');
  const [customPriceName, setCustomPriceName] = useState<string>('Pan Especial / Varios');

  // Expandable bottom customer loyalty section
  const [showLoyaltySection, setShowLoyaltySection] = useState<boolean>(false);
  // Ticket lines
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);
  
  // Customer & Loyalty
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Completed Ticket Modal state (optional fallback)
  const [completedTicket, setCompletedTicket] = useState<SaleTicket | null>(null);
  const [autoPrintTicket, setAutoPrintTicket] = useState<boolean>(false);

  // Direct Thermal Printing state (Mandar directo a impresión sin abrir ventana secundaria)
  const [directPrintTicket, setDirectPrintTicket] = useState<SaleTicket | null>(null);
  const [printToastNotice, setPrintToastNotice] = useState<string>('');

  // Pedido para Recoger en Tienda (Botón Morado) state
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderCustomerName, setOrderCustomerName] = useState<string>('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState<string>('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState<string>(getTodayString());
  const [orderDeliveryTime, setOrderDeliveryTime] = useState<string>(getNowTimeString());
  const [orderPaymentMode, setOrderPaymentMode] = useState<'pagado' | 'pendiente'>('pendiente');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [createdOrder, setCreatedOrder] = useState<BakeryOrder | null>(null);
  const [showCubileteCelebration, setShowCubileteCelebration] = useState<BakeryOrder | null>(null);

  // Pide y Recoge Modal Bread Catalog & Custom Item State
  const [orderModalItems, setOrderModalItems] = useState<TicketItem[]>([]);
  const [catalogItemSearch, setCatalogItemSearch] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogBreadItem | null>(null);
  const [orderItemNameInput, setOrderItemNameInput] = useState<string>('');
  const [orderItemQtyInput, setOrderItemQtyInput] = useState<number>(10);
  const [orderItemPriceInput, setOrderItemPriceInput] = useState<string>('8.00');
  const [orderItemUnit, setOrderItemUnit] = useState<string>('PZ');
  const [orderItemType, setOrderItemType] = useState<string>('Normal');
  
  // Virtual Touch Price Keypad state for Pide y Recoge Modal
  const [showOrderVirtualKeypad, setShowOrderVirtualKeypad] = useState<boolean>(false);
  const [virtualKeypadMode, setVirtualKeypadMode] = useState<'new_price' | 'edit_item_price' | 'new_qty' | 'edit_item_qty'>('new_price');
  const [virtualKeypadEditingIndex, setVirtualKeypadEditingIndex] = useState<number | null>(null);
  const [virtualKeypadValue, setVirtualKeypadValue] = useState<string>('8.00');

  // Load Master Dynamic Catalog
  const activeMasterCatalog = React.useMemo(() => {
    return loadMasterCatalog();
  }, [showOrderModal]);

  // Customer rate info for Pide y Recoge modal
  const orderCustomerRateInfo = React.useMemo(() => {
    return normalizeCustomerKey(orderCustomerName);
  }, [orderCustomerName]);

  // Filtered Catalog suggestions for Autocomplete (matches initials e.g. "te" -> "Telera", "bol" -> "Bolillo")
  const catalogSuggestions = React.useMemo(() => {
    const query = catalogItemSearch.trim().toLowerCase();
    if (!query) return [];
    return activeMasterCatalog
      .filter(item => {
        const nameLower = item.name.toLowerCase();
        const queryClean = query.toLowerCase();
        const startsWithMatch = nameLower.startsWith(queryClean);
        const wordMatch = nameLower.split(' ').some(w => w.startsWith(queryClean));
        const containsMatch = nameLower.includes(queryClean);
        const numMatch = item.num.toString() === queryClean;
        return startsWithMatch || wordMatch || containsMatch || numMatch;
      })
      .slice(0, 12);
  }, [catalogItemSearch, activeMasterCatalog]);

  // 5 Top Requested Breads in Pide y Recoge with Customer Dynamic Pricing
  const top5PickupBreads = React.useMemo(() => {
    const list = [
      { key: 'telera', label: 'Telera', emoji: '🥖', fallbackNum: 1 },
      { key: 'bolillo', label: 'Bolillo', emoji: '🥖', fallbackNum: 3 },
      { key: 'concha', label: 'Concha', emoji: '🍩', fallbackNum: 16 },
      { key: 'cuerno', label: 'Cuerno', emoji: '🥐', fallbackNum: 31 },
      { key: 'bisquet', label: 'Bisquet', emoji: '🥯', fallbackNum: 39 }
    ];

    return list.map(b => {
      const found = activeMasterCatalog.find(p => 
        p.name.toLowerCase().includes(b.key) || p.num === b.fallbackNum
      ) || activeMasterCatalog.find(p => p.num === b.fallbackNum);
      const calculatedPrice = found 
        ? getProductPriceForCustomer(found, orderCustomerName, 'recoger_tienda') 
        : 8;
      return {
        ...b,
        product: found,
        resolvedPrice: calculatedPrice
      };
    });
  }, [activeMasterCatalog, orderCustomerName]);

  // Totals for Pide y Recoge Modal
  const orderModalSubtotal = orderModalItems.reduce((acc, it) => acc + it.total, 0);
  const orderModalPieces = orderModalItems.reduce((acc, it) => acc + it.quantity, 0);

  // Heart Bread Celebration Popup state (Cobro sin ticket)
  const [celebrationData, setCelebrationData] = useState<{
    total: number;
    folio: string;
    piecesCount: number;
    customerName?: string;
  } | null>(null);

  // Clientes Preferentes / Precios Especiales toggle
  const [showPreferentialPrices, setShowPreferentialPrices] = useState<boolean>(false);

  // Cash Change Calculator state for the ticket panel
  const [cashGivenInput, setCashGivenInput] = useState<string>('');

  // Quick bill denominations for change calculation (Mexican Banknotes)
  const quickBills = [
    { value: 50, label: '$50', bg: 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-300', active: 'bg-pink-600 text-white border-pink-700 ring-2 ring-pink-400 font-black shadow-sm' },
    { value: 100, label: '$100', bg: 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300', active: 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400 font-black shadow-sm' },
    { value: 200, label: '$200', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300', active: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-black shadow-sm' },
    { value: 500, label: '$500', bg: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300', active: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400 font-black shadow-sm' },
    { value: 1000, label: '$1,000', bg: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300', active: 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400 font-black shadow-sm' }
  ];

  // Paleta & Postres selection modals/popovers
  const [showPaletaModal, setShowPaletaModal] = useState<boolean>(false);
  const [showPostresModal, setShowPostresModal] = useState<boolean>(false);

  // Precios rápidos de mostrador solicitados: 5, 6.50, 8, 12, 15, 18, 20, 25, 30, 35
  const quickPrices = [5, 6.5, 8, 12, 15, 18, 20, 25, 30, 35];

  // Precios especiales para Clientes Preferentes ordenados: 4, 5, 5.50, 6, 7, 7.50, 9, 11, 12.50, 13
  const preferentialPrices = [4, 5, 5.5, 6, 7, 7.5, 9, 11, 12.5, 13];

  // Helper formatting for prices
  const formatMoneyLabel = (num: number) => {
    if (num % 1 !== 0) {
      return `$${num.toFixed(2)}`;
    }
    return `$${num}`;
  };

  // Companion & Dairy items (Acompañamientos, Lácteos y Charolas)
  const companionItems = [
    {
      id: 'p_leche',
      name: 'Leche $35',
      title: 'LECHE 35',
      price: 35,
      emoji: '🥛',
      tag: 'No es Pan',
      description: 'Leche 1 Litro'
    },
    {
      id: 'p_lechitas_18',
      name: 'Lechita $18',
      title: 'LECHITA 18',
      price: 18,
      emoji: '🧃',
      tag: 'No es Pan',
      description: 'Lechita Sabor'
    },
    {
      id: 'p_nata',
      name: 'Nata $90',
      title: 'NATA 90',
      price: 90,
      emoji: '🍶',
      tag: 'No es Pan',
      description: 'Nata Artesanal'
    },
    {
      id: 'p_queso',
      name: 'Queso $150',
      title: 'QUESO 150',
      price: 150,
      emoji: '🧀',
      tag: 'No es Pan',
      description: 'Queso Rancho'
    },
    {
      id: 'p_domo_25',
      name: 'Charola / Domo $25',
      title: 'CHAROLA 25',
      price: 25,
      emoji: '🍱',
      tag: 'Charola',
      description: 'Charola Domo'
    },
    {
      id: 'p_gelatina_20',
      name: 'Gelatina $20',
      title: 'GELATINA 20',
      price: 20,
      emoji: '🍮',
      tag: 'Postre',
      description: 'Gelatina'
    },
    {
      id: 'p_arroz_leche_25',
      name: 'Arroz con Leche $25',
      title: 'ARROZ LECHE 25',
      price: 25,
      emoji: '🍚',
      tag: 'Postre',
      description: 'Arroz c/ Leche'
    }
  ];

  // Auto look up customer when phone number reaches 10 digits
  useEffect(() => {
    const clean = phoneSearch.replace(/\D/g, '');
    if (clean.length === 10) {
      const found = customers.find(c => c.phone.replace(/\D/g, '') === clean);
      if (found) {
        setSelectedCustomer(found);
        setShowNewCustomerForm(false);
        playBeep(800, 'sine', 0.05);
      } else {
        setSelectedCustomer(null);
        setShowNewCustomerForm(true);
      }
    } else if (clean.length === 0) {
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
      setPointsToRedeem(0);
    }
  }, [phoneSearch, customers]);

  // Calculations
  const subtotal = ticketItems.reduce((acc, item) => acc + item.total, 0);
  const totalPieces = ticketItems.reduce((acc, item) => acc + item.quantity, 0);
  const maxRedeemablePoints = selectedCustomer ? Math.min(selectedCustomer.points, subtotal) : 0;
  const actualDiscount = Math.min(pointsToRedeem, maxRedeemablePoints);
  const total = Math.max(0, subtotal - actualDiscount);

  // Cash Change computations for the ticket area (50, 100, 200, 500, 1000)
  const numericCashGiven = parseFloat(cashGivenInput) || 0;
  const calculatedPosChange = numericCashGiven >= total ? numericCashGiven - total : 0;
  const cashShortage = (numericCashGiven > 0 && numericCashGiven < total) ? total - numericCashGiven : 0;

  // Points that will be earned in this purchase ($20 pesos = 1 point)
  const pointsEarned = Math.floor(total / (settings.loyaltyPointsPerPesos || 20));

  // Add item with current multiplier
  const handleAddPrice = (price: number, name?: string, productId?: string) => {
    playBeep(700, 'sine', 0.06);
    const qty = selectedMultiplier > 0 ? selectedMultiplier : 1;
    const itemName = name || (price === 8 ? 'Bolillo / Telera ($8)' : price === 10 ? 'Pan Dulce Tradicional ($10)' : price === 12 ? 'Dona / Especial ($12)' : price === 18 ? 'Cuerno Mantequilla ($18)' : price === 20 ? 'Oreja / Empanada ($20)' : price === 25 ? 'Panqué Nuez/Elote ($25)' : price === 35 ? 'Baguette Rústica ($35)' : price === 90 ? 'Rosca Mediana ($90)' : price === 100 ? 'Pastel / Tarta ($100)' : price === 150 ? 'Pastel Grande 3 Leches ($150)' : `Pan de $${price}`);

    setTicketItems(prev => {
      // If same price already exists as the last entry or with same name, merge it or append
      const existingIdx = prev.findIndex(item => item.price === price && item.name === itemName);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + qty;
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          total: newQty * current.price
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `item-${Date.now()}-${Math.random()}`,
            productId,
            name: itemName,
            price: price,
            quantity: qty,
            total: qty * price
          }
        ];
      }
    });

    // Reset multiplier to 1 for next pick
    setSelectedMultiplier(1);
    setCustomMultiplierInput('');
  };

  const handleCustomMultiplierKeypad = (key: string) => {
    playBeep(750, 'sine', 0.03);
    if (key === 'C') {
      setNumpadValue('');
      return;
    }
    if (key === 'BACKSPACE') {
      setNumpadValue(prev => prev.slice(0, -1));
      return;
    }
    if (key.startsWith('+')) {
      const delta = parseInt(key.replace('+', ''), 10) || 0;
      const current = parseInt(numpadValue, 10) || 0;
      const next = current + delta;
      setNumpadValue(next.toString());
      return;
    }
    // Standard digits 0-9
    if (numpadValue === '0') {
      setNumpadValue(key);
    } else if (numpadValue.length < 4) {
      setNumpadValue(prev => prev + key);
    }
  };

  const handleConfirmCustomMultiplierSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const qty = parseInt(numpadValue, 10);
    if (!isNaN(qty) && qty > 0) {
      playBeep(650, 'sine', 0.04);
      setSelectedMultiplier(qty);
      setCustomMultiplierInput(qty.toString());
      setShowNumpadModal(false);
      setNumpadValue('');
    }
  };

  const handleCustomPriceKeypad = (key: string) => {
    playBeep(750, 'sine', 0.03);
    if (key === 'C') {
      setCustomPriceVal('');
      return;
    }
    if (key === 'BACKSPACE') {
      setCustomPriceVal(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (!customPriceVal) {
        setCustomPriceVal('0.');
      } else if (!customPriceVal.includes('.')) {
        setCustomPriceVal(prev => prev + '.');
      }
      return;
    }
    if (key === '00') {
      if (!customPriceVal || customPriceVal === '0') return;
      if (customPriceVal.length >= 7) return;
      setCustomPriceVal(prev => prev + '00');
      return;
    }
    if (key.startsWith('+')) {
      const delta = parseFloat(key.replace('+', '')) || 0;
      const current = parseFloat(customPriceVal) || 0;
      setCustomPriceVal((current + delta).toString());
      return;
    }
    // Standard digits 0-9
    if (customPriceVal === '0') {
      setCustomPriceVal(key);
    } else if (customPriceVal.length < 7) {
      setCustomPriceVal(prev => prev + key);
    }
  };

  const handleAddCustomPriceSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const p = parseFloat(customPriceVal);
    if (!isNaN(p) && p > 0) {
      handleAddPrice(p, customPriceName.trim() || `Pan Especial $${p}`);
      setShowCustomPriceModal(false);
      setCustomPriceVal('');
      setCustomPriceName('Pan Especial');
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    playBeep(600, 'sine', 0.04);
    setTicketItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        total: newQty * item.price
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    playBeep(400, 'sawtooth', 0.06);
    setTicketItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClearTicket = () => {
    if (ticketItems.length === 0) return;
    playBeep(350, 'sawtooth', 0.08);
    setTicketItems([]);
    setPointsToRedeem(0);
    setCashGivenInput('');
  };

  // Register new customer quickly
  const handleCreateCustomer = () => {
    const cleanPhone = phoneSearch.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return;
    const name = newCustomerName.trim() || `Cliente ${cleanPhone.slice(-4)}`;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone: cleanPhone,
      points: 0,
      totalSpent: 0,
      visitsCount: 0,
      lastVisit: getTodayString()
    };
    onRegisterCustomer(newCust);
    setSelectedCustomer(newCust);
    setShowNewCustomerForm(false);
    playCashSound();
  };

  // Process & Complete Sale with Direct Print (Sin abrir ventana secundaria)
  const handleCompleteSale = () => {
    if (ticketItems.length === 0) return;

    playCashSound();

    const folio = getNextTicketFolio();
    const effectivePaid = numericCashGiven > 0 ? numericCashGiven : total;
    const effectiveChange = effectivePaid >= total ? effectivePaid - total : 0;

    const newTicket: SaleTicket = {
      id: `sale-${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      date: getTodayString(),
      time: getNowTimeString(),
      items: [...ticketItems],
      subtotal,
      discount: actualDiscount,
      total,
      paymentMethod: 'efectivo',
      amountPaid: effectivePaid,
      change: effectiveChange,
      customerName: selectedCustomer ? selectedCustomer.name : (newCustomerName.trim() || undefined),
      customerPhone: selectedCustomer ? selectedCustomer.phone : (phoneSearch.replace(/\D/g, '') || undefined),
      pointsEarned,
      pointsRedeemed: actualDiscount,
      cashier: 'Mostrador Principal',
      shift: activeShift
    };

    let updatedCust: Customer | undefined;
    if (selectedCustomer) {
      updatedCust = {
        ...selectedCustomer,
        points: selectedCustomer.points - actualDiscount + pointsEarned,
        totalSpent: selectedCustomer.totalSpent + total,
        visitsCount: selectedCustomer.visitsCount + 1,
        lastVisit: getTodayString()
      };
    } else if (phoneSearch.replace(/\D/g, '').length >= 10 && newCustomerName.trim()) {
      updatedCust = {
        id: `cust-${Date.now()}`,
        name: newCustomerName.trim(),
        phone: phoneSearch.replace(/\D/g, ''),
        points: pointsEarned,
        totalSpent: total,
        visitsCount: 1,
        lastVisit: getTodayString()
      };
    }

    onSaveTicket(newTicket, updatedCust);

    // Mandar DIRECTO a impresión térmica sin ventana secundaria
    setDirectPrintTicket(newTicket);
    setPrintToastNotice(`🖨️ Imprimiendo Ticket #${folio} ($${total}.00)...`);
    setTimeout(() => {
      setPrintToastNotice('');
    }, 3500);

    // Ejecutar impresión directa térmica aislada
    printTicketDirectToPrinter(newTicket, settings);

    // Reset local counter state for next customer
    setTicketItems([]);
    setPointsToRedeem(0);
    setCashGivenInput('');
    setPhoneSearch('');
    setSelectedCustomer(null);
    setNewCustomerName('');
    setShowNewCustomerForm(false);
  };

  // Process & Complete Sale WITHOUT Ticket (Triggers celebratory smiling donut animation)
  const handleQuickCheckoutWithoutTicket = () => {
    if (ticketItems.length === 0) return;

    playCashSound();

    const folio = getNextTicketFolio();
    const currentTotal = total;
    const currentPieces = totalPieces;
    const custName = selectedCustomer ? selectedCustomer.name : (newCustomerName.trim() || undefined);
    const effectivePaid = numericCashGiven > 0 ? numericCashGiven : currentTotal;
    const effectiveChange = effectivePaid >= currentTotal ? effectivePaid - currentTotal : 0;

    const newTicket: SaleTicket = {
      id: `sale-${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      date: getTodayString(),
      time: getNowTimeString(),
      items: ticketItems,
      subtotal,
      discount: actualDiscount,
      total: currentTotal,
      paymentMethod: 'efectivo',
      amountPaid: effectivePaid,
      change: effectiveChange,
      customerName: custName,
      customerPhone: selectedCustomer ? selectedCustomer.phone : (phoneSearch.replace(/\D/g, '') || undefined),
      pointsEarned,
      pointsRedeemed: actualDiscount,
      cashier: 'Mostrador Principal',
      shift: activeShift
    };

    let updatedCust: Customer | undefined;
    if (selectedCustomer) {
      updatedCust = {
        ...selectedCustomer,
        points: selectedCustomer.points - actualDiscount + pointsEarned,
        totalSpent: selectedCustomer.totalSpent + currentTotal,
        visitsCount: selectedCustomer.visitsCount + 1,
        lastVisit: getTodayString()
      };
    } else if (phoneSearch.replace(/\D/g, '').length >= 10 && newCustomerName.trim()) {
      updatedCust = {
        id: `cust-${Date.now()}`,
        name: newCustomerName.trim(),
        phone: phoneSearch.replace(/\D/g, ''),
        points: pointsEarned,
        totalSpent: currentTotal,
        visitsCount: 1,
        lastVisit: getTodayString()
      };
    }

    onSaveTicket(newTicket, updatedCust);

    // Trigger Donut animation popup
    setCelebrationData({
      total: currentTotal,
      folio,
      piecesCount: currentPieces,
      customerName: custName
    });

    // Reset local counter state for next customer
    setTicketItems([]);
    setPointsToRedeem(0);
    setCashGivenInput('');
    setPhoneSearch('');
    setSelectedCustomer(null);
    setNewCustomerName('');
    setShowNewCustomerForm(false);
  };

  // Process & Complete Sale with PayPal POS Zettle Card Terminal
  const handleZettleCardCheckout = (cardDetails: {
    terminal: 'zettle';
    authCode: string;
    last4?: string;
    reference?: string;
  }) => {
    if (ticketItems.length === 0) return;

    playCashSound();
    const folio = getNextTicketFolio();

    const newTicket: SaleTicket = {
      id: `sale-${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      date: getTodayString(),
      time: getNowTimeString(),
      items: ticketItems,
      subtotal,
      discount: actualDiscount,
      total,
      paymentMethod: 'tarjeta',
      cardTerminal: 'zettle',
      cardAuthCode: cardDetails.authCode,
      cardLast4: cardDetails.last4,
      cardReference: cardDetails.reference || folio,
      amountPaid: total,
      change: 0,
      customerName: selectedCustomer ? selectedCustomer.name : (newCustomerName.trim() || undefined),
      customerPhone: selectedCustomer ? selectedCustomer.phone : (phoneSearch.replace(/\D/g, '') || undefined),
      pointsEarned,
      pointsRedeemed: actualDiscount,
      cashier: 'Mostrador Principal',
      shift: activeShift
    };

    let updatedCust: Customer | undefined;
    if (selectedCustomer) {
      updatedCust = {
        ...selectedCustomer,
        points: selectedCustomer.points - actualDiscount + pointsEarned,
        totalSpent: selectedCustomer.totalSpent + total,
        visitsCount: selectedCustomer.visitsCount + 1,
        lastVisit: getTodayString()
      };
    } else if (phoneSearch.replace(/\D/g, '').length >= 10 && newCustomerName.trim()) {
      updatedCust = {
        id: `cust-${Date.now()}`,
        name: newCustomerName.trim(),
        phone: phoneSearch.replace(/\D/g, ''),
        points: pointsEarned,
        totalSpent: total,
        visitsCount: 1,
        lastVisit: getTodayString()
      };
    }

    onSaveTicket(newTicket, updatedCust);
    setShowZettleModal(false);

    // Mandar directo a impresión térmica sin abrir modal secundario
    setDirectPrintTicket(newTicket);
    setPrintToastNotice(`🖨️ Imprimiendo Ticket Tarjeta #${folio} ($${total}.00)...`);
    setTimeout(() => {
      setPrintToastNotice('');
    }, 3500);

    // Ejecutar impresión directa térmica aislada
    printTicketDirectToPrinter(newTicket, settings);

    // Reset local counter state for next customer
    setTicketItems([]);
    setPointsToRedeem(0);
    setCashGivenInput('');
    setPhoneSearch('');
    setSelectedCustomer(null);
    setNewCustomerName('');
    setShowNewCustomerForm(false);
  };

  // Lista de clientes frecuentes para Pide y Recoge (Trascos, Magda, Bollos David, Deliz)
  const availablePickupCustomers = React.useMemo(() => {
    const allowed = ['trascos', 'magda', 'bollos david', 'deliz'];
    const pool = driverCustomers.length > 0 ? driverCustomers : DEFAULT_DRIVER_CUSTOMERS;
    const filtered = pool.filter(c => 
      (c.driverId === 'tienda' || c.customerType === 'recoger_tienda') &&
      allowed.includes(c.name.trim().toLowerCase())
    );
    if (filtered.length > 0) return filtered;
    return DEFAULT_DRIVER_CUSTOMERS.filter(c => c.driverId === 'tienda');
  }, [driverCustomers]);

  // Abrir modal para registrar Pedido Pide y Recoge (Botón Morado) - Permite abrirse aunque ticket esté vacío
  const handleOpenOrderModal = () => {
    playBeep(700, 'sine', 0.06);
    setCreatedOrder(null);

    // Auto-completar datos si hay cliente seleccionado en mostrador
    if (selectedCustomer) {
      setOrderCustomerName(selectedCustomer.name);
      setOrderCustomerPhone(selectedCustomer.phone);
    } else {
      setOrderCustomerName(newCustomerName.trim() || '');
      setOrderCustomerPhone(phoneSearch.replace(/\D/g, '') || '');
    }

    // Inicializar la lista de productos por entregar con los items del ticket actual (o lista vacía para llenar desde 0)
    setOrderModalItems(ticketItems.length > 0 ? [...ticketItems] : []);
    setCatalogItemSearch('');
    setIsSearchDropdownOpen(false);
    setSelectedCatalogItem(null);
    setOrderItemNameInput('');
    setOrderItemQtyInput(10);
    setOrderItemPriceInput('8.00');
    setOrderItemUnit('PZ');
    setOrderItemType('Normal');
    setShowOrderVirtualKeypad(false);

    setOrderPaymentMode('pendiente');
    setOrderDeliveryDate(getTodayString());
    setOrderDeliveryTime(getNowTimeString());
    setOrderNotes('');
    setShowOrderModal(true);
  };

  // Seleccionar cliente rápido y auto-llenar su teléfono y recalcular precios
  const handleSelectOrderCustomer = (name: string, phone?: string, notes?: string) => {
    setOrderCustomerName(name);
    if (phone) {
      setOrderCustomerPhone(phone);
    }
    if (notes && !orderNotes) {
      setOrderNotes(notes);
    }
    // Si hay un pan del catálogo seleccionado, recalcular su precio para el nuevo cliente
    if (selectedCatalogItem) {
      const calculated = getProductPriceForCustomer(selectedCatalogItem, name, 'recoger_tienda');
      setOrderItemPriceInput(calculated.toFixed(2));
    }
    playBeep(650, 'sine', 0.04);
  };

  // Seleccionar pan del catálogo interactivo
  const handleSelectCatalogBread = (bread: CatalogBreadItem) => {
    playBeep(700, 'sine', 0.04);
    setSelectedCatalogItem(bread);
    setOrderItemNameInput(bread.name);
    setCatalogItemSearch(bread.name);
    setIsSearchDropdownOpen(false);
    
    // Auto-calcular tarifa negociada del cliente
    const negotiatedPrice = getProductPriceForCustomer(bread, orderCustomerName, 'recoger_tienda');
    setOrderItemPriceInput(negotiatedPrice.toFixed(2));
    setOrderItemUnit(bread.defaultUnit || 'PZ');
    setOrderItemType(bread.name.toLowerCase().includes('mini') ? 'Mini' : 'Normal');
  };

  // Seleccionar uno de los 5 panes más solicitados en Pide y Recoge (Telera, Bolillo, Concha, Cuerno, Bisquet)
  const handleSelectTop5QuickBread = (quick: { label: string; product?: CatalogBreadItem; resolvedPrice: number }) => {
    playBeep(750, 'sine', 0.04);
    if (quick.product) {
      handleSelectCatalogBread(quick.product);
    } else {
      setOrderItemNameInput(quick.label);
      setCatalogItemSearch(quick.label);
      setOrderItemPriceInput(quick.resolvedPrice.toFixed(2));
      setIsSearchDropdownOpen(false);
    }
  };

  // Agregar Producto al Pedido dentro del modal
  const handleAddProductToOrderModal = () => {
    const name = orderItemNameInput.trim() || catalogItemSearch.trim();
    if (!name) {
      playBeep(400, 'sawtooth', 0.06);
      alert('Escribe o selecciona un pan del catálogo');
      return;
    }

    const price = parseFloat(orderItemPriceInput) || 0;
    const qty = Math.max(1, orderItemQtyInput || 1);

    playCashSound();
    const newItem: TicketItem = {
      id: `order-item-${Date.now()}-${Math.random()}`,
      productId: selectedCatalogItem?.id || `catalog-custom-${Date.now()}`,
      name: `${name}${orderItemUnit !== 'PZ' ? ` (${orderItemUnit})` : ''}`,
      price: price,
      quantity: qty,
      total: Math.round(price * qty * 100) / 100
    };

    setOrderModalItems(prev => [...prev, newItem]);

    // Limpiar para el siguiente pan
    setCatalogItemSearch('');
    setOrderItemNameInput('');
    setSelectedCatalogItem(null);
    setOrderItemQtyInput(10);
    setIsSearchDropdownOpen(false);
  };

  // Quitar producto de la lista de entrega del pedido
  const handleRemoveOrderModalItem = (index: number) => {
    playBeep(400, 'sawtooth', 0.05);
    setOrderModalItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Modificar cantidad (+ / -) de un producto en la lista de entrega
  const handleUpdateOrderModalItemQty = (index: number, delta: number) => {
    playBeep(600, 'sine', 0.04);
    setOrderModalItems(prev => {
      const updated = [...prev];
      const it = updated[index];
      const newQty = it.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index] = {
        ...it,
        quantity: newQty,
        total: Math.round(newQty * it.price * 100) / 100
      };
      return updated;
    });
  };

  // Teclado Virtual Táctil para Precio
  const handleOpenPriceKeypadForNewItem = () => {
    playBeep(650, 'sine', 0.03);
    setVirtualKeypadMode('new_price');
    setVirtualKeypadEditingIndex(null);
    setVirtualKeypadValue(orderItemPriceInput || '8.00');
    setShowOrderVirtualKeypad(true);
  };

  const handleOpenPriceKeypadForExistingItem = (index: number) => {
    playBeep(650, 'sine', 0.03);
    setVirtualKeypadMode('edit_item_price');
    setVirtualKeypadEditingIndex(index);
    setVirtualKeypadValue(orderModalItems[index].price.toString());
    setShowOrderVirtualKeypad(true);
  };

  const handleVirtualKeypadInput = (key: string) => {
    playBeep(750, 'sine', 0.03);
    if (key === 'C') {
      setVirtualKeypadValue('');
      return;
    }
    if (key === 'BACKSPACE') {
      setVirtualKeypadValue(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (!virtualKeypadValue) {
        setVirtualKeypadValue('0.');
      } else if (!virtualKeypadValue.includes('.')) {
        setVirtualKeypadValue(prev => prev + '.');
      }
      return;
    }
    if (key === '00') {
      if (!virtualKeypadValue || virtualKeypadValue === '0') return;
      if (virtualKeypadValue.length >= 7) return;
      setVirtualKeypadValue(prev => prev + '00');
      return;
    }
    if (key.startsWith('+')) {
      const delta = parseFloat(key.replace('+', '')) || 0;
      const current = parseFloat(virtualKeypadValue) || 0;
      const res = current + delta;
      setVirtualKeypadValue(res % 1 === 0 ? res.toString() : res.toFixed(2));
      return;
    }
    // Digits 0-9
    if (virtualKeypadValue === '0') {
      setVirtualKeypadValue(key);
    } else if (virtualKeypadValue.length < 7) {
      setVirtualKeypadValue(prev => prev + key);
    }
  };

  const handleConfirmVirtualKeypad = () => {
    const val = parseFloat(virtualKeypadValue) || 0;
    if (virtualKeypadMode === 'new_price') {
      setOrderItemPriceInput(val.toFixed(2));
    } else if (virtualKeypadMode === 'edit_item_price' && virtualKeypadEditingIndex !== null) {
      setOrderModalItems(prev => {
        const updated = [...prev];
        const it = updated[virtualKeypadEditingIndex];
        if (it) {
          updated[virtualKeypadEditingIndex] = {
            ...it,
            price: val,
            total: Math.round(val * it.quantity * 100) / 100
          };
        }
        return updated;
      });
    }
    playCashSound();
    setShowOrderVirtualKeypad(false);
  };

  // Generar Pedido Pide y Recoge
  const handleGenerateStoreOrder = () => {
    if (orderModalItems.length === 0) {
      playBeep(400, 'sawtooth', 0.08);
      alert('Por favor agrega al menos un pan en Productos por Entregar.');
      return;
    }

    const trimmedName = orderCustomerName.trim() || (selectedCustomer ? selectedCustomer.name : 'Cliente Pide y Recoge');
    const folio = getNextOrderFolio();
    const isPaid = orderPaymentMode === 'pagado';

    const orderItems = orderModalItems.map((item, idx) => ({
      breadId: item.productId || `pos-${Date.now()}-${idx}`,
      name: item.name,
      category: 'Pan de Mostrador',
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
      done: true
    }));

    const newOrder: BakeryOrder = {
      id: `ord-${Date.now()}`,
      folio,
      customerName: trimmedName,
      customerPhone: orderCustomerPhone.trim() || (selectedCustomer ? selectedCustomer.phone : ''),
      deliveryType: 'tienda',
      orderChannel: 'recoger_tienda',
      address: 'Pide y Recoge en Mostrador de Tienda',
      deliveryDate: orderDeliveryDate || getTodayString(),
      deliveryTime: orderDeliveryTime || getNowTimeString(),
      items: orderItems,
      total: orderModalSubtotal,
      deposit: isPaid ? orderModalSubtotal : 0,
      pendingAmount: isPaid ? 0 : orderModalSubtotal,
      paymentStatus: isPaid ? 'pagado' : 'pendiente',
      assignedDriverId: 'ninguno',
      deliveryStatus: 'pendiente',
      notes: orderNotes.trim() ? `[PIDE Y RECOGE - ${isPaid ? 'PAGADO' : 'POR COBRAR'}] ${orderNotes.trim()}` : `[PIDE Y RECOGE - ${isPaid ? 'PAGADO' : 'POR COBRAR'}]`,
      createdAt: new Date().toISOString(),
      origin: 'mostrador'
    };

    if (onSaveOrder) {
      onSaveOrder(newOrder);
    }

    playCashSound();
    setCreatedOrder(newOrder);
    setShowCubileteCelebration(newOrder);

    setPrintToastNotice(`✨ Pedido Pide y Recoge #${folio} ($${orderModalSubtotal}.00) generado con éxito`);
    setTimeout(() => {
      setPrintToastNotice('');
    }, 4000);
  };

  // Imprimir Ticket del Pedido Generado
  const handlePrintStoreOrderTicket = () => {
    if (!createdOrder) return;
    playCashSound();
    printOrderTicketDirectToPrinter(createdOrder, settings);
    setPrintToastNotice(`🖨️ Imprimiendo Ticket de Pedido #${createdOrder.folio}...`);
    setTimeout(() => {
      setPrintToastNotice('');
    }, 3500);
  };

  // Cerrar modal de pedido y resetear mostrador si ya se generó el pedido
  const handleCloseOrderModal = () => {
    if (createdOrder) {
      setTicketItems([]);
      setPointsToRedeem(0);
      setCashGivenInput('');
      setPhoneSearch('');
      setSelectedCustomer(null);
      setNewCustomerName('');
      setShowNewCustomerForm(false);
    }
    setShowOrderModal(false);
    setCreatedOrder(null);
  };

  // Direct Bluetooth Pairing shortcut from top bar or ticket area
  const handleQuickBluetoothPairing = async () => {
    setIsConnectingZettlePos(true);
    playBeep(700, 'sine', 0.05);
    try {
      const res = await connectZettleBluetooth();
      if (res.success && res.device) {
        setZettleDevice(res.device);
        playCashSound();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnectingZettlePos(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-2">
      {/* Toast Notificación de Impresión Directa sin ventana secundaria */}
      {printToastNotice && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border-2 border-amber-400 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center animate-pulse shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-amber-300 font-extrabold text-[11px] uppercase tracking-wide">
                Impresión Directa Térmica
              </div>
              <div className="text-white font-bold">{printToastNotice}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrintToastNotice('')}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left side Price & Quantity controls (67%), Right side Compact Sticky Ticket (33%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        
        {/* LEFT COLUMN: Fast Multiplier + Big Preset Price Buttons & Accompaniments */}
        <div className="lg:col-span-8 space-y-2">
          
          {/* BARRA DE CAMBIO DE TURNO MANUAL (Turno 1 / Turno 2) */}
          <div className="bg-gradient-to-r from-amber-50 via-white to-indigo-50/50 rounded-2xl p-2.5 sm:p-3 shadow-xs border-2 border-amber-300 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-[200px]">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs border ${
                activeShift === 'turno1' 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : 'bg-indigo-600 text-white border-indigo-700'
              }`}>
                {activeShift === 'turno1' ? '🌅' : '🌇'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                    TURNO REGISTRANDO:
                  </span>
                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    activeShift === 'turno1'
                      ? 'bg-amber-100 text-amber-950 border-amber-400'
                      : 'bg-indigo-100 text-indigo-950 border-indigo-400'
                  }`}>
                    {activeShift === 'turno1' ? 'Turno 1 (Mañana)' : 'Turno 2 (Tarde)'}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 block">
                  {activeShift === 'turno1'
                    ? 'Horario habitual 07:00 a 15:00 hrs — Cambia a Turno 2 cuando hagan relevo temprano'
                    : 'Horario habitual 15:00 a 22:00 hrs — Ventas asignadas a la tarde'}
                </span>
              </div>
            </div>

            {/* Switch Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl border border-slate-300">
              <button
                id="shift-switch-turno1-btn"
                type="button"
                onClick={() => handleToggleShift('turno1')}
                className={`px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  activeShift === 'turno1'
                    ? 'bg-amber-500 text-amber-950 shadow-md ring-2 ring-amber-600 scale-102 font-black'
                    : 'bg-transparent text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
                title="Activar Turno 1 (Mañana) para registrar ventas"
              >
                <span>🌅 Turno 1</span>
                {activeShift === 'turno1' && (
                  <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse"></span>
                )}
              </button>

              <button
                id="shift-switch-turno2-btn"
                type="button"
                onClick={() => handleToggleShift('turno2')}
                className={`px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  activeShift === 'turno2'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-700 scale-102 font-black'
                    : 'bg-transparent text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
                title="Activar Turno 2 (Tarde) para registrar ventas"
              >
                <span>🌇 Turno 2</span>
                {activeShift === 'turno2' && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                )}
              </button>
            </div>
          </div>

          {/* 1. Multiplier Selector Bar (Tablet Touch Optimized - Compact & Fast) */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-[#E5E1DA]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D95D39] inline-block"></span>
                Paso 1: Cantidad de Piezas
              </span>
              <span className="text-[11px] font-bold text-[#D95D39] bg-[#FFF5F0] px-2 py-0.5 rounded-full border border-[#E5E1DA]">
                Multiplicador: <strong className="text-xs text-[#D95D39]">{selectedMultiplier}</strong> {selectedMultiplier === 1 ? 'pza' : 'pzs'}
              </span>
            </div>

            {/* Quick 1 to 10 + Botón Manual / Teclado Virtual en el mismo estilo que Precios */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = selectedMultiplier === num && !customMultiplierInput;
                return (
                  <button
                    key={num}
                    id={`qty-btn-${num}`}
                    type="button"
                    onClick={() => {
                      playBeep(500 + num * 30, 'sine', 0.04);
                      setSelectedMultiplier(num);
                      setCustomMultiplierInput('');
                    }}
                    className={`h-14 sm:h-16 lg:h-18 rounded-2xl font-black text-2xl sm:text-3xl lg:text-4xl font-mono flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-[#D95D39] text-white shadow-md shadow-[#D95D3940] ring-4 ring-[#D95D39]/40 scale-102 z-10'
                        : 'bg-[#FAF8F6] hover:bg-[#FFF5F0] text-slate-950 border-2 border-[#E5E1DA] hover:border-[#D95D39]'
                    }`}
                  >
                    <span className="leading-none">{num}</span>
                    <span className={`text-[10px] sm:text-xs font-black leading-none mt-0.5 ${isSelected ? 'text-white/95' : 'text-slate-600'}`}>
                      {num === 1 ? 'pza' : 'pzs'}
                    </span>
                  </button>
                );
              })}

              {/* Botón Exactamente Igual al Botón de Precios: + / Otro / Manual con Teclado Táctil */}
              <button
                id="custom-multiplier-modal-btn"
                type="button"
                onClick={() => {
                  playBeep(700, 'sine', 0.04);
                  setNumpadValue(selectedMultiplier > 10 ? selectedMultiplier.toString() : '');
                  setShowNumpadModal(true);
                }}
                className={`border-2 rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs h-14 sm:h-16 lg:h-18 cursor-pointer ${
                  selectedMultiplier > 10 || customMultiplierInput !== ''
                    ? 'bg-[#D95D39] text-white border-[#D95D39] ring-4 ring-[#D95D39]/40'
                    : 'bg-[#FFF5F0] hover:bg-[#FFEAE0] border-dashed border-[#D95D39] hover:border-[#D95D39] text-[#D95D39]'
                }`}
                title="Abrir teclado virtual en pantalla para ingresar cualquier cantidad de piezas"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-tight leading-none mt-0.5">
                  {selectedMultiplier > 10 ? `${selectedMultiplier} pzs` : 'Otro'}
                </span>
                <span className={`text-[9px] sm:text-[10px] font-black leading-none mt-0.5 ${selectedMultiplier > 10 ? 'text-white/95' : 'text-slate-700'}`}>
                  {selectedMultiplier > 10 ? 'Manual' : 'Teclado'}
                </span>
              </button>
            </div>

            {/* Quick Multiplier Badges (Cantidades frecuentes desde 11 en adelante en una fila limpia horizontal) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 mt-2 pt-2 border-t-2 border-[#E5E1DA] no-scrollbar">
              <span className="text-xs font-black uppercase text-slate-700 shrink-0 mr-1">
                Más de 10:
              </span>
              {[11, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => {
                    playBeep(600, 'sine', 0.04);
                    setSelectedMultiplier(qty);
                    setCustomMultiplierInput(qty.toString());
                  }}
                  className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono transition-all cursor-pointer shrink-0 active:scale-95 border-2 ${
                    selectedMultiplier === qty
                      ? 'bg-[#D95D39] text-white border-[#D95D39] ring-2 ring-[#D95D39] shadow-xs'
                      : 'bg-[#FAF8F6] text-slate-800 hover:bg-[#FFF5F0] hover:text-[#D95D39] border-[#E5E1DA]'
                  }`}
                >
                  {qty} pzs
                </button>
              ))}
            </div>
          </div>

          {/* 2. Fast Preset Price Grid (Precios de Pan) + Clientes Preferentes + Acompañamientos & Lácteos */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-[#E5E1DA] space-y-2">
            
            {/* Step 2 Header with Preferente Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Paso 2: Toca el Pan o Acompañamiento
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Botón Desplegable / Selector Cliente Preferente */}
                <button
                  id="toggle-preferente-btn"
                  type="button"
                  onClick={() => {
                    playBeep(650, 'triangle', 0.05);
                    setShowPreferentialPrices(!showPreferentialPrices);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer border shadow-xs active:scale-95 ${
                    showPreferentialPrices
                      ? 'bg-amber-500 text-amber-950 border-amber-600 ring-2 ring-amber-400'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  }`}
                  title="Mostrar Precios Especiales para Clientes Preferentes"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-600 text-amber-700" />
                  <span>⭐ Precios Cliente Preferente</span>
                  {showPreferentialPrices ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-950" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-800" />
                  )}
                </button>

                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  +{selectedMultiplier} {selectedMultiplier === 1 ? 'pza' : 'pzs'}
                </span>
              </div>
            </div>

            {/* SECCIÓN PREFERENTE DESPLEGABLE (Precios: 4, 5, 6, 7, 12.50) */}
            {showPreferentialPrices && (
              <div className="p-2.5 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/70 rounded-2xl border-2 border-amber-400 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-600 animate-bounce" />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950">
                      ⭐ Tarifas Especiales - Cliente Preferente:
                    </span>
                    <span className="text-[10px] bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded-md border border-amber-400">
                      Descuento Preferente
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-950 font-mono bg-amber-200/80 px-2 py-0.5 rounded-md">
                    Toque directo (+{selectedMultiplier})
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2">
                  {preferentialPrices.map((prefPrice) => {
                    const labelPrice = formatMoneyLabel(prefPrice);
                    return (
                      <button
                        key={prefPrice}
                        id={`pref-price-btn-${prefPrice}`}
                        type="button"
                        onClick={() => handleAddPrice(prefPrice, `Pan Preferente ${labelPrice}`, `p_pref_${prefPrice}`)}
                        className="group relative bg-white hover:bg-amber-100 border-2 border-amber-400 hover:border-amber-600 rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 lg:h-20 cursor-pointer"
                      >
                        <div className="absolute top-1 left-1.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        </div>
                        <div className="absolute top-1 right-1.5">
                          <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs border border-amber-300 font-black shadow-2xs font-mono">
                            +{selectedMultiplier}
                          </span>
                        </div>

                        <div className="text-2xl sm:text-3xl font-black text-amber-950 group-hover:text-amber-700 tracking-tight leading-none mt-2 font-mono">
                          {labelPrice}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-black text-amber-900 leading-none truncate mt-1">
                          Preferente
                        </div>

                        {selectedMultiplier > 1 && (
                          <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-md border-2 border-white font-mono">
                            =${(selectedMultiplier * prefPrice).toFixed(prefPrice % 1 !== 0 ? 2 : 0)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECCIÓN 1: Precios de Pan (5, 6.50, 8, 12, 15, 18, 20, 25, 30, 35) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <span className="text-base">🥖</span> Precios de Pan:
                </span>
                <span className="text-xs text-slate-600 font-bold">Piezas de mostrador</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 sm:gap-2">
                {quickPrices.map((price) => {
                  const prod = products.find(p => p.price === price);
                  const displayPrice = price === 6.5 ? '$6.50' : `$${price}`;
                  return (
                    <button
                      key={price}
                      id={`price-btn-${price}`}
                      type="button"
                      onClick={() => handleAddPrice(price, `Pan ${displayPrice}`, prod?.id)}
                      className="group relative bg-[#FAF8F6] hover:bg-[#FFF5F0] border-2 border-[#E5E1DA] hover:border-[#D95D39] rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 lg:h-20 cursor-pointer"
                    >
                      <div className="absolute top-1 left-1.5">
                        <span className="bg-white text-slate-800 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs border border-[#E5E1DA] font-black shadow-2xs font-mono">
                          +{selectedMultiplier}
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 group-hover:text-[#D95D39] tracking-tight leading-none mt-2 font-mono">
                        {displayPrice}
                      </div>

                      {/* Live total badge preview when multiplier > 1 */}
                      {selectedMultiplier > 1 && (
                        <div className="absolute -top-2 -right-2 bg-[#D95D39] text-white text-xs font-black px-2 py-0.5 rounded-full shadow-md border-2 border-white font-mono z-10">
                          =${price === 6.5 ? (selectedMultiplier * price).toFixed(2) : selectedMultiplier * price}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Manual Custom Price Button */}
                <button
                  id="custom-price-btn"
                  type="button"
                  onClick={() => setShowCustomPriceModal(true)}
                  className="bg-[#FFF5F0] hover:bg-[#FFEAE0] border-2 border-dashed border-[#D95D39] hover:border-[#D95D39] rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 text-[#D95D39] shadow-xs h-16 sm:h-18 lg:h-20 cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-[#D95D39] stroke-[2.5]" />
                  <span className="text-xs font-black uppercase tracking-tight leading-none mt-0.5">Otro</span>
                  <span className="text-[10px] text-slate-700 font-bold leading-none mt-0.5">Manual</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: Acompañamientos, Lácteos y Postres (NO ES PAN) */}
            <div className="pt-2 border-t-2 border-dashed border-sky-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-sky-950">
                    Acompañamientos, Lácteos & Postres
                  </span>
                  <span className="text-[9px] bg-sky-100 text-sky-800 font-black px-2 py-0.5 rounded-md border border-sky-300">
                    No es Pan
                  </span>
                </div>
                <span className="text-xs font-bold text-sky-800 font-mono">
                  Toque directo (+{selectedMultiplier})
                </span>
              </div>

              {/* Botones Claros y Táctiles para Acompañamientos, Paleta desplegable y Postres */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
                {/* 1. Leche 35 */}
                <button
                  id="companion-btn-p_leche"
                  type="button"
                  onClick={() => handleAddPrice(35, 'Leche 1L $35', 'p_leche')}
                  className="group relative bg-gradient-to-b from-sky-50 to-white hover:from-sky-100 hover:to-sky-50 border-2 border-sky-300 hover:border-sky-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🥛</div>
                  <div className="absolute top-1 right-1.5">
                    <span className="bg-white text-slate-800 px-1 py-0.2 rounded text-[8px] border border-sky-200 font-extrabold shadow-2xs font-mono">
                      +{selectedMultiplier}
                    </span>
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-sky-950 leading-tight">LECHE $35</div>
                  <div className="text-[9px] font-extrabold text-sky-700 leading-none mt-0.5">1 Litro</div>
                </button>

                {/* 2. Lechita 18 */}
                <button
                  id="companion-btn-p_lechita"
                  type="button"
                  onClick={() => handleAddPrice(18, 'Lechita $18', 'p_lechitas_18')}
                  className="group relative bg-gradient-to-b from-sky-50 to-white hover:from-sky-100 hover:to-sky-50 border-2 border-sky-300 hover:border-sky-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🧃</div>
                  <div className="absolute top-1 right-1.5">
                    <span className="bg-white text-slate-800 px-1 py-0.2 rounded text-[8px] border border-sky-200 font-extrabold shadow-2xs font-mono">
                      +{selectedMultiplier}
                    </span>
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-sky-950 leading-tight">LECHITA $18</div>
                  <div className="text-[9px] font-extrabold text-sky-700 leading-none mt-0.5">Sabor</div>
                </button>

                {/* 3. Nata 90 */}
                <button
                  id="companion-btn-p_nata"
                  type="button"
                  onClick={() => handleAddPrice(90, 'Nata $90', 'p_nata')}
                  className="group relative bg-gradient-to-b from-sky-50 to-white hover:from-sky-100 hover:to-sky-50 border-2 border-sky-300 hover:border-sky-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🍶</div>
                  <div className="absolute top-1 right-1.5">
                    <span className="bg-white text-slate-800 px-1 py-0.2 rounded text-[8px] border border-sky-200 font-extrabold shadow-2xs font-mono">
                      +{selectedMultiplier}
                    </span>
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-sky-950 leading-tight">NATA $90</div>
                  <div className="text-[9px] font-extrabold text-sky-700 leading-none mt-0.5">Artesanal</div>
                </button>

                {/* 4. Queso 150 */}
                <button
                  id="companion-btn-p_queso"
                  type="button"
                  onClick={() => handleAddPrice(150, 'Queso $150', 'p_queso')}
                  className="group relative bg-gradient-to-b from-sky-50 to-white hover:from-sky-100 hover:to-sky-50 border-2 border-sky-300 hover:border-sky-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🧀</div>
                  <div className="absolute top-1 right-1.5">
                    <span className="bg-white text-slate-800 px-1 py-0.2 rounded text-[8px] border border-sky-200 font-extrabold shadow-2xs font-mono">
                      +{selectedMultiplier}
                    </span>
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-sky-950 leading-tight">QUESO $150</div>
                  <div className="text-[9px] font-extrabold text-sky-700 leading-none mt-0.5">Rancho</div>
                </button>

                {/* 5. PALETA (1 Solo Botón con 3 Precios Desplegables: 40, 45, 50) */}
                <button
                  id="companion-btn-paleta-dropdown"
                  type="button"
                  onClick={() => {
                    playBeep(750, 'sine', 0.04);
                    setShowPaletaModal(true);
                  }}
                  className="group relative bg-gradient-to-b from-cyan-50 to-sky-100 hover:from-cyan-100 hover:to-sky-200 border-2 border-cyan-400 hover:border-cyan-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                  title="Toca para elegir entre precios de Paleta: $40, $45 y $50"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🍧</div>
                  <div className="absolute top-1 right-1.5">
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-800 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-cyan-950 leading-tight flex items-center gap-0.5">
                    PALETA
                  </div>
                  <div className="text-[9px] font-black text-cyan-900 leading-none bg-cyan-200/90 px-1.5 py-0.5 rounded-md mt-0.5 font-mono">
                    $40 · 45 · 50
                  </div>
                </button>

                {/* 6. POSTRES (Desplegable Gelatina 20 y Arroz con Leche 25) */}
                <button
                  id="companion-btn-postres-dropdown"
                  type="button"
                  onClick={() => {
                    playBeep(750, 'sine', 0.04);
                    setShowPostresModal(true);
                  }}
                  className="group relative bg-gradient-to-b from-pink-50 to-rose-100 hover:from-pink-100 hover:to-rose-200 border-2 border-pink-300 hover:border-pink-500 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                  title="Toca para elegir Postres: Gelatina $20 o Arroz con Leche $25"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🍮</div>
                  <div className="absolute top-1 right-1.5">
                    <ChevronDown className="w-3.5 h-3.5 text-pink-800 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-pink-950 leading-tight">POSTRES</div>
                  <div className="text-[9px] font-black text-pink-900 leading-none bg-pink-200/90 px-1.5 py-0.5 rounded-md mt-0.5 font-mono">
                    $20 · $25
                  </div>
                </button>

                {/* 7. CHAROLA / DOMO 25 (Charola de Domo para transportar pan) */}
                <button
                  id="companion-btn-domo-25"
                  type="button"
                  onClick={() => handleAddPrice(25, 'Charola / Domo $25', 'p_domo_25')}
                  className="group relative bg-gradient-to-b from-amber-50 to-orange-100 hover:from-amber-100 hover:to-orange-200 border-2 border-amber-400 hover:border-amber-600 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs hover:shadow-md h-16 sm:h-18 cursor-pointer text-center"
                  title="Charola / Domo para empaque"
                >
                  <div className="absolute top-1 left-1.5 text-sm">🍱</div>
                  <div className="absolute top-1 right-1.5">
                    <span className="bg-white text-slate-800 px-1 py-0.2 rounded text-[8px] border border-amber-300 font-extrabold shadow-2xs font-mono">
                      +{selectedMultiplier}
                    </span>
                  </div>
                  <div className="pt-2 text-xs sm:text-sm font-black text-amber-950 leading-tight">CHAROLA $25</div>
                  <div className="text-[9px] font-extrabold text-amber-800 leading-none truncate mt-0.5">Domo Empaque</div>
                  {selectedMultiplier > 1 && (
                    <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full shadow-md border-2 border-white font-mono">
                      =${selectedMultiplier * 25}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* CLUB DE PUNTOS SANTA FÉ (Directamente en la pantalla principal en lugar del catálogo) */}
          <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-100/80 rounded-2xl p-3 shadow-xs border-2 border-amber-300">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-[#D95D39] text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-amber-950 leading-tight">
                      ⭐ Club de Puntos Santa Fé
                    </h3>
                    <span className="text-[9px] font-black bg-amber-200 text-amber-950 border border-amber-400 px-1.5 py-0.2 rounded-full shadow-2xs">
                      $20 = 1 Punto
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800 font-semibold">
                    Registra o busca por teléfono para acumular o canjear
                  </p>
                </div>
              </div>

              {selectedCustomer && (
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Cliente Activo
                </span>
              )}
            </div>

            {/* Customer Lookup or Selected Customer */}
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border-2 border-emerald-400 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                      <span>{selectedCustomer.name}</span>
                      <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                        ⭐ {selectedCustomer.points} pts disponibles
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">Tel: {selectedCustomer.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setPhoneSearch('');
                      setPointsToRedeem(0);
                    }}
                    className="text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Cambiar o quitar cliente"
                  >
                    ✕ Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="customer-phone-search"
                      type="tel"
                      placeholder="Escribe el teléfono del cliente (10 dígitos)..."
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      className="w-full bg-white pl-8 pr-3 py-2 rounded-xl text-xs sm:text-sm border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-[#D95D39] focus:border-[#D95D39] font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                  {phoneSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneSearch('');
                        setSelectedCustomer(null);
                        setShowNewCustomerForm(false);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-2 bg-white rounded-xl font-bold border border-amber-300 shrink-0 cursor-pointer"
                    >
                      ✕ Borrar
                    </button>
                  )}
                </div>

                {/* New Customer Inline registration box if searched and not found */}
                {showNewCustomerForm && !selectedCustomer && (
                  <div className="pt-2 border-t border-amber-200 bg-white p-2.5 rounded-xl space-y-2 border border-amber-300 animate-in fade-in">
                    <div className="flex items-center justify-between text-slate-900">
                      <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                        <UserPlus className="w-4 h-4 text-[#D95D39] shrink-0" />
                        <span>Cliente no registrado con {phoneSearch}. ¿Deseas afiliarlo ahora?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerForm(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs px-1 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        id="new-customer-name-input"
                        type="text"
                        placeholder="Nombre completo del cliente..."
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="flex-1 bg-[#FAF8F6] px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-[#D95D39] outline-none text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateCustomer();
                          }
                        }}
                      />
                      <button
                        id="register-customer-btn"
                        type="button"
                        onClick={handleCreateCustomer}
                        className="bg-gradient-to-r from-[#D95D39] to-[#BF4C2A] hover:from-[#BF4C2A] hover:to-[#9E3B1C] text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Afiliar Cliente</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Ticket directly at the Top & Sticky in View (col-span-4) */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-18 z-20 self-start">
          <div className="bg-white rounded-2xl shadow-md border-2 border-[#E5E1DA] flex flex-col max-h-[calc(100vh-4.5rem)] overflow-y-auto">
            
            {/* Ticket Header (Compact) */}
            <div className="bg-[#2D3142] text-white px-3 py-1.5 flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#FAF8F6]" />
                <div>
                  <h2 className="font-bold text-sm leading-tight">Ticket</h2>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {totalPieces} piezas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Active Shift Toggle Badge in Ticket Header */}
                <button
                  id="active-shift-ticket-badge-btn"
                  type="button"
                  onClick={() => handleToggleShift(activeShift === 'turno1' ? 'turno2' : 'turno1')}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 transition-all cursor-pointer border ${
                    activeShift === 'turno1'
                      ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 border-amber-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                  }`}
                  title="Click para cambiar entre Turno 1 y Turno 2"
                >
                  <span>{activeShift === 'turno1' ? '🌅 T1' : '🌇 T2'}</span>
                </button>

                {/* Zettle Bluetooth Quick Status/Pair Button */}
                <button
                  id="zettle-header-bt-btn"
                  type="button"
                  onClick={handleQuickBluetoothPairing}
                  disabled={isConnectingZettlePos}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    zettleDevice?.connected 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400'
                  }`}
                  title={zettleDevice?.connected ? `Terminal Zettle Conectada (${zettleDevice.name})` : 'Conectar Terminal PayPal Zettle por Bluetooth'}
                >
                  <Bluetooth className="w-3 h-3" />
                  <span>{isConnectingZettlePos ? 'Buscando...' : zettleDevice?.connected ? 'Zettle OK' : 'Zettle BT'}</span>
                </button>

                {ticketItems.length > 0 && (
                  <button
                    id="clear-ticket-btn"
                    onClick={handleClearTicket}
                    className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    title="Limpiar todo el ticket"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Borrar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ticket Line Items List (Adaptive height with inner scrollbar) */}
            <div className="p-2 flex-1 min-h-[60px] max-h-[140px] sm:max-h-[160px] overflow-y-auto space-y-1.5 bg-[#FAF8F6] border-b-2 border-[#E5E1DA]">
              {ticketItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-3 text-slate-400">
                  <div className="w-9 h-9 rounded-full bg-[#FFF5F0] text-[#D95D39] flex items-center justify-center mb-1 font-bold text-base border border-[#E5E1DA]">
                    🥖
                  </div>
                  <p className="font-black text-slate-800 text-sm">Ticket Vacío</p>
                  <p className="text-xs text-slate-600 max-w-[200px] font-bold">
                    Toca la cantidad y el precio para cobrar
                  </p>
                </div>
              ) : (
                ticketItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white p-2 rounded-xl border-2 border-[#E5E1DA] shadow-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-mono font-black text-base sm:text-lg text-slate-950">
                          {item.quantity}x ${item.price} =
                        </span>
                        <span className="font-mono font-black text-lg sm:text-xl text-[#D95D39]">
                          ${item.total}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-700 truncate leading-tight mt-0.5">
                        {item.name}
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateQuantity(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-[#FAF8F6] hover:bg-[#FFF5F0] text-slate-900 font-black flex items-center justify-center text-base active:scale-95 border-2 border-[#E5E1DA] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black font-mono text-sm sm:text-base text-slate-950">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-[#FFF5F0] hover:bg-[#FFEAE0] text-[#D95D39] font-black flex items-center justify-center text-base active:scale-95 border-2 border-[#D95D39]/40 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="w-7 h-7 rounded-lg text-rose-600 hover:bg-rose-100 flex items-center justify-center ml-1 transition-colors cursor-pointer border border-rose-200"
                        title="Eliminar partida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Loyalty Points Redemption Bar (if customer has points) */}
            {selectedCustomer && selectedCustomer.points > 0 && subtotal > 0 && (
              <div className="bg-[#FFF5F0] p-2 border-b-2 border-[#E5E1DA] flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold truncate">
                  <Sparkles className="w-4 h-4 text-[#D95D39] shrink-0" />
                  <span className="truncate">{selectedCustomer.name.split(' ')[0]}:</span>
                  <strong className="text-emerald-700 font-mono font-black text-sm">${selectedCustomer.points} pts</strong>
                </div>
                {pointsToRedeem === 0 ? (
                  <button
                    onClick={() => {
                      playBeep(850, 'sine', 0.08);
                      setPointsToRedeem(maxRedeemablePoints);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow-xs shrink-0 cursor-pointer font-mono"
                  >
                    Canjear -${maxRedeemablePoints}
                  </button>
                ) : (
                  <button
                    onClick={() => setPointsToRedeem(0)}
                    className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-[#E5E1DA] font-bold px-2 py-1 rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>
            )}

            {/* Totals & Action Section (Always Fixed in View & Never Cut Off) */}
            <div className="p-3 sm:p-3.5 bg-white space-y-2.5 shrink-0 border-t-2 border-[#E5E1DA]">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 font-bold text-xs sm:text-sm">
                  <span>Subtotal ({totalPieces} piezas):</span>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base">${subtotal}.00</span>
                </div>

                {actualDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-black text-xs sm:text-sm">
                    <span>Desc. Club ({actualDiscount} pts):</span>
                    <span className="font-mono">-${actualDiscount}.00</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-1 border-t-2 border-[#E5E1DA]">
                  <span className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight">Total a Cobrar:</span>
                  <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#D95D39] font-mono tracking-tight drop-shadow-xs">
                    ${total}.00
                  </span>
                </div>

                {pointsEarned > 0 && (
                  <div className="text-right text-xs text-[#D95D39] font-black">
                    ⭐ +{pointsEarned} pts al cliente en esta compra
                  </div>
                )}
              </div>

              {/* CALCULADORA DE CAMBIO RÁPIDO SOLICITADA (Compacta y sin tapar botones) */}
              {ticketItems.length > 0 && total > 0 && (
                <div className="bg-[#FAF8F6] rounded-2xl p-2.5 border-2 border-amber-400 shadow-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-[#D95D39]" />
                      <span>¿Con cuánto pagan? (Cambio)</span>
                    </span>
                    {cashGivenInput && (
                      <button
                        type="button"
                        onClick={() => {
                          playBeep(450, 'sine', 0.03);
                          setCashGivenInput('');
                        }}
                        className="text-xs font-black text-slate-600 hover:text-[#D95D39] underline cursor-pointer"
                        title="Borrar cálculo"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Fila de Billetes Rápidos: Exacto, 50, 100, 200, 500, 1000 */}
                  <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                    <button
                      id="quick-bill-exact-btn"
                      type="button"
                      onClick={() => {
                        playBeep(750, 'sine', 0.03);
                        setCashGivenInput(total.toString());
                      }}
                      className={`py-2 px-1 rounded-xl font-black text-xs sm:text-sm font-mono transition-all text-center border-2 cursor-pointer active:scale-95 ${
                        numericCashGiven === total
                          ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 shadow-xs'
                          : 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-300'
                      }`}
                      title="Pago exacto sin cambio"
                    >
                      Exacto
                    </button>

                    {quickBills.map((bill) => {
                      const isSelected = numericCashGiven === bill.value;
                      return (
                        <button
                          key={bill.value}
                          id={`quick-bill-${bill.value}-btn`}
                          type="button"
                          onClick={() => {
                            playBeep(700, 'sine', 0.03);
                            setCashGivenInput(bill.value.toString());
                          }}
                          className={`py-2 px-1 rounded-xl font-black text-xs sm:text-sm font-mono transition-all text-center border-2 cursor-pointer active:scale-95 ${
                            isSelected ? bill.active : bill.bg
                          }`}
                          title={`Calcular cambio si pagan con billete de ${bill.label}`}
                        >
                          {bill.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Input personalizado manual */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">$</span>
                      <input
                        id="custom-cash-input-field"
                        type="number"
                        placeholder="Otro billete o moneda..."
                        value={cashGivenInput}
                        onChange={(e) => setCashGivenInput(e.target.value)}
                        className="w-full pl-6 pr-3 py-1.5 bg-white rounded-xl text-sm font-black font-mono border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-[#D95D39] text-slate-900"
                        title="Escribe cualquier monto recibido"
                      />
                    </div>

                    {numericCashGiven > 0 && numericCashGiven < total && (
                      <div className="bg-amber-500 text-amber-950 px-2.5 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm shrink-0 border border-amber-600">
                        Faltan: ${cashShortage}.00
                      </div>
                    )}
                  </div>

                  {/* Alerta Visual Compacta de Cambio para nunca ocultar los botones */}
                  {numericCashGiven > 0 && numericCashGiven > total && (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 px-3 rounded-2xl flex items-center justify-between shadow-md border-2 border-emerald-400 animate-in zoom-in-95">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wide text-emerald-100">
                        <span>💵 CAMBIO:</span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-amber-200 tracking-tight">
                        ${calculatedPosChange}.00
                      </div>
                      <div className="text-xs font-black text-emerald-100 font-mono">
                        (${numericCashGiven} - ${total})
                      </div>
                    </div>
                  )}

                  {numericCashGiven === total && numericCashGiven > 0 && (
                    <div className="bg-emerald-100 border-2 border-emerald-300 text-emerald-950 py-1 px-2.5 rounded-xl text-center text-xs sm:text-sm font-black">
                      ✅ Pago Exacto (${total}.00) — Sin cambio
                    </div>
                  )}
                </div>
              )}

              {/* Cuadrícula 2x2 de Botones de Cobro para no requerir scroll */}
              <div className="space-y-2 pt-0.5">
                <div className="grid grid-cols-2 gap-2">
                  {/* Fila 1 - Col 1: Cobrar sin Ticket */}
                  <button
                    id="quick-checkout-no-ticket-btn"
                    type="button"
                    disabled={ticketItems.length === 0}
                    onClick={handleQuickCheckoutWithoutTicket}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 sm:py-3.5 px-2 rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm lg:text-base cursor-pointer border-2 border-emerald-500 text-center"
                    title="Registrar venta inmediatamente sin ticket (animación de dona sonriente)"
                  >
                    <span className="text-lg sm:text-xl">🍩</span>
                    <span className="leading-tight">Sin Ticket</span>
                  </button>

                  {/* Fila 1 - Col 2: Cobrar Ticket */}
                  <button
                    id="checkout-and-print-btn"
                    type="button"
                    disabled={ticketItems.length === 0}
                    onClick={() => handleCompleteSale()}
                    className="bg-gradient-to-r from-[#D95D39] to-[#BF4C2A] hover:from-[#BF4C2A] hover:to-[#9E3B1C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 sm:py-3.5 px-2 rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm lg:text-base cursor-pointer border-2 border-[#BF4C2A] text-center"
                    title="Cobrar en efectivo e imprimir ticket térmico directo"
                  >
                    <Printer className="w-5 h-5 shrink-0 stroke-[2.5]" />
                    <span className="leading-tight">Cobrar Ticket 🖨️</span>
                  </button>

                  {/* Fila 2 - Col 1: Cobrar Tarjeta / Zettle Bluetooth */}
                  <button
                    id="zettle-pos-checkout-btn"
                    type="button"
                    disabled={ticketItems.length === 0}
                    onClick={() => {
                      playBeep(700, 'sine', 0.05);
                      setShowZettleModal(true);
                    }}
                    className="bg-gradient-to-r from-[#002C8A] via-[#004BB3] to-[#0079C1] hover:from-[#001D5C] hover:to-[#005B94] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 sm:py-3.5 px-2 rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm lg:text-base cursor-pointer border-2 border-blue-400 text-center relative"
                    title="Cobrar con tarjeta usando Terminal PayPal Zettle por Bluetooth"
                  >
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="leading-tight">Tarjeta 💳</span>
                    </div>
                    {zettleDevice?.connected && (
                      <span className="hidden sm:inline-block absolute -top-2 -right-1 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black border-2 border-white">
                        BT ON
                      </span>
                    )}
                  </button>

                  {/* Fila 2 - Col 2: PEDIDO PIDE Y RECOGE (BOTÓN MORADO) */}
                  <button
                    id="pos-order-credit-btn"
                    type="button"
                    onClick={handleOpenOrderModal}
                    className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black py-3 sm:py-3.5 px-2 rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm lg:text-base cursor-pointer border-2 border-purple-400 text-center relative"
                    title="Registrar o armar pedido Pide y Recoge (desde 0 o con panes del ticket)"
                  >
                    <ClipboardList className="w-5 h-5 text-amber-300 shrink-0 stroke-[2.5]" />
                    <div className="flex flex-col items-center sm:items-start leading-tight">
                      <span>Pide y Recoge 🛍️</span>
                    </div>
                    <span className="hidden sm:inline-block absolute -top-2 -right-1 bg-amber-400 text-purple-950 text-[9px] px-2 py-0.5 rounded-full font-black border-2 border-purple-900 shadow-2xs">
                      Recoge
                    </span>
                  </button>
                </div>

                {/* BOTÓN: CORTE DE CAJA / CORTE DEL TURNO */}
                <button
                  id="shift-cut-open-btn"
                  type="button"
                  onClick={() => {
                    playBeep(650, 'sine', 0.05);
                    setShowShiftCutModal(true);
                  }}
                  className="w-full bg-[#FAF8F6] hover:bg-[#FFF5F0] text-slate-900 hover:text-[#D95D39] border-2 border-amber-300 hover:border-[#D95D39] font-black py-2 px-3 rounded-2xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                  title="Abrir ventana de Corte de Caja / Corte del Turno con salidas a proveedores y cálculo automático"
                >
                  <Receipt className="w-4 h-4 text-[#D95D39]" />
                  <span>Corte de Caja / Corte del Turno 📋</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Sticky Checkout Bar (Only on small screens when ticket has items so buttons never get lost) */}
      {ticketItems.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-2 right-2 z-40 bg-[#2D3142] text-white p-2 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center justify-between gap-1.5 animate-in slide-in-from-bottom-5">
          <div className="flex flex-col pl-1 min-w-[55px]">
            <span className="text-[9px] text-slate-300 font-bold uppercase">{totalPieces} pzs</span>
            <span className="text-base font-black text-amber-400 leading-none">${total}.00</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              id="mobile-zettle-checkout-btn"
              type="button"
              onClick={() => {
                playBeep(700, 'sine', 0.05);
                setShowZettleModal(true);
              }}
              className="bg-gradient-to-r from-[#002C8A] to-[#0079C1] text-white font-black text-[11px] py-2 px-2 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer border border-blue-400 whitespace-nowrap"
              title="Cobrar Tarjeta Zettle"
            >
              <CreditCard className="w-3 h-3 text-amber-300" />
              <span>Tarjeta</span>
            </button>

            <button
              id="mobile-pos-order-credit-btn"
              type="button"
              onClick={handleOpenOrderModal}
              className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white font-black text-[11px] py-2 px-2 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer border border-purple-400 whitespace-nowrap"
              title="Pedido Pide y Recoge"
            >
              <ClipboardList className="w-3 h-3 text-amber-300" />
              <span>Pide y Recoge 🛍️</span>
            </button>

            <button
              id="mobile-quick-checkout-no-ticket-btn"
              type="button"
              onClick={handleQuickCheckoutWithoutTicket}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[11px] py-2 px-2 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer border border-emerald-400 whitespace-nowrap"
            >
              <span>🍩</span>
              <span>Sin Ticket</span>
            </button>

            <button
              id="mobile-checkout-print-btn"
              type="button"
              onClick={() => handleCompleteSale()}
              className="bg-gradient-to-r from-[#D95D39] to-[#BF4C2A] text-white font-black text-[11px] py-2 px-2 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer border border-[#BF4C2A] whitespace-nowrap"
            >
              <Printer className="w-3 h-3 shrink-0" />
              <span>Ticket</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Custom Price Modal with On-Screen Touch Keypad */}
      {showCustomPriceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-md w-full border-2 border-[#D95D39]/30 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF5F0] text-[#D95D39] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">
                    Precio Manual
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Toca las teclas para ingresar el monto sin teclado
                  </p>
                </div>
              </div>
              <button
                id="close-custom-price-modal-btn"
                type="button"
                onClick={() => {
                  setShowCustomPriceModal(false);
                  setCustomPriceVal('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Display: Big Digital Screen */}
            <div className="mt-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-3.5 text-white shadow-inner text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Monto Unitario
              </div>
              <div className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1 my-0.5">
                <span className="text-amber-400 font-extrabold">$</span>
                <span>{customPriceVal || '0'}</span>
                <span className="w-0.5 h-8 bg-amber-400 animate-pulse ml-0.5 rounded-full inline-block"></span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                <span className="bg-slate-700/80 px-2 py-0.5 rounded-md">
                  +{selectedMultiplier} {selectedMultiplier === 1 ? 'pieza' : 'piezas'}
                </span>
                <span>=</span>
                <span className="text-emerald-400 font-black text-sm">
                  ${((parseFloat(customPriceVal) || 0) * selectedMultiplier).toFixed(customPriceVal.includes('.') ? 2 : 0)}
                </span>
              </div>
            </div>

            {/* Fast 1-Touch Category Tags */}
            <div className="mt-3">
              <div className="text-[10px] font-extrabold uppercase text-slate-500 mb-1 flex items-center justify-between">
                <span>Concepto / Nombre:</span>
                <span className="text-slate-700 font-bold">{customPriceName}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: 'Pan Esp.', fullName: 'Pan Especial', icon: '🥖' },
                  { label: 'Pastel', fullName: 'Pastel / Tarta', icon: '🎂' },
                  { label: 'Galletas', fullName: 'Galletas', icon: '🍪' },
                  { label: 'Repostería', fullName: 'Repostería Fina', icon: '🍩' },
                  { label: 'Varios', fullName: 'Producto Varios', icon: '🛒' }
                ].map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      playBeep(700, 'sine', 0.02);
                      setCustomPriceName(cat.fullName);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      customPriceName === cat.fullName
                        ? 'bg-[#D95D39] text-white border-[#D95D39] shadow-xs scale-102'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-xs mb-0.5">{cat.icon}</span>
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* On-Screen Touch Keypad */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('7')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('8')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('9')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('BACKSPACE')}
                className="h-12 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-bold text-sm rounded-xl border border-rose-200 shadow-2xs cursor-pointer flex flex-col items-center justify-center"
                title="Borrar último dígito"
              >
                <Delete className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase leading-none mt-0.5">Borrar</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('4')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('5')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('6')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('C')}
                className="h-12 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-black text-sm rounded-xl border border-slate-300 shadow-2xs cursor-pointer flex flex-col items-center justify-center"
                title="Limpiar monto a 0"
              >
                <span className="text-base font-black leading-none">C</span>
                <span className="text-[8px] font-black uppercase leading-none mt-0.5">Limpiar</span>
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('1')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('2')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('3')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('+10')}
                className="h-12 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 font-black text-sm rounded-xl border border-amber-300 shadow-2xs cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-xs font-black">+10</span>
                <span className="text-[7.5px] font-bold text-amber-700">pesos</span>
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('0')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('00')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-base rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                00
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('.')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xl rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleCustomPriceKeypad('+50')}
                className="h-12 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 font-black text-sm rounded-xl border border-amber-300 shadow-2xs cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-xs font-black">+50</span>
                <span className="text-[7.5px] font-bold text-amber-700">pesos</span>
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowCustomPriceModal(false);
                  setCustomPriceVal('');
                }}
                className="w-1/3 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-custom-price-btn"
                disabled={!customPriceVal || parseFloat(customPriceVal) <= 0}
                onClick={() => handleAddCustomPriceSubmit()}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#D95D39] to-[#bf4c2a] hover:from-[#bf4c2a] hover:to-[#a33e20] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-md shadow-[#D95D3933] transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  Agregar ${( (parseFloat(customPriceVal) || 0) * selectedMultiplier ).toFixed(customPriceVal.includes('.') ? 2 : 0)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cantidad Personalizada / Multiplicador de Piezas con Teclado Virtual Táctil */}
      {showNumpadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-md w-full border-2 border-[#D95D39]/30 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF5F0] text-[#D95D39] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">
                    Cantidad de Piezas
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Toca las teclas para ingresar el número de piezas sin teclado físico
                  </p>
                </div>
              </div>
              <button
                id="close-numpad-modal-btn"
                type="button"
                onClick={() => {
                  setShowNumpadModal(false);
                  setNumpadValue('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Display: Big Digital Screen */}
            <div className="mt-3 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl p-4 text-white shadow-inner text-center border-2 border-amber-400">
              <div className="text-xs uppercase font-black text-amber-300 tracking-wider">
                Multiplicador / Cantidad de Piezas
              </div>
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-white flex items-center justify-center gap-2 my-1">
                <span className="text-amber-400 font-black font-mono">{numpadValue || '0'}</span>
                <span className="text-2xl font-black text-slate-300 ml-1">piezas</span>
                <span className="w-1 h-10 bg-amber-400 animate-pulse ml-0.5 rounded-full inline-block"></span>
              </div>
              <div className="text-xs font-bold text-slate-300">
                Al tocar cualquier precio de pan se multiplicará por{' '}
                <strong className="text-amber-300 text-sm font-black font-mono">{numpadValue || '0'}</strong>
              </div>
            </div>

            {/* Botones de Acceso Rápido Frecuentes (+5, +10, +20, +50, +100) */}
            <div className="mt-3">
              <div className="text-xs font-black uppercase text-slate-700 mb-1">
                Sumar Rápido:
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {['+5', '+10', '+12', '+20', '+50'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCustomMultiplierKeypad(btn)}
                    className="py-2 px-1 rounded-xl text-sm font-black bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-amber-400 active:scale-95 cursor-pointer shadow-xs transition-all flex flex-col items-center justify-center"
                  >
                    <span>{btn}</span>
                    <span className="text-[9px] font-bold text-amber-800">pzs</span>
                  </button>
                ))}
              </div>
            </div>

            {/* On-Screen Touch Keypad for Quantities */}
            <div className="mt-3.5 grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('7')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('8')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('9')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('BACKSPACE')}
                className="h-14 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 font-black text-sm rounded-2xl border-2 border-rose-300 shadow-xs cursor-pointer flex flex-col items-center justify-center"
                title="Borrar último dígito"
              >
                <Delete className="w-6 h-6 stroke-[2.5]" />
                <span className="text-[9px] font-black uppercase leading-none mt-0.5">Borrar</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('4')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('5')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('6')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('C')}
                className="h-14 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-900 font-black text-base rounded-2xl border-2 border-slate-400 shadow-xs cursor-pointer flex flex-col items-center justify-center"
                title="Limpiar a 0"
              >
                <span className="text-xl font-black leading-none">C</span>
                <span className="text-[9px] font-black uppercase leading-none mt-0.5">Limpiar</span>
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('1')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('2')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('3')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('+100')}
                className="h-14 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-sm rounded-2xl border-2 border-amber-400 shadow-xs cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-sm font-black">+100</span>
                <span className="text-[9px] font-bold text-amber-800">pzs</span>
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('0')}
                className="col-span-2 h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('00')}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-950 font-black text-xl rounded-2xl border-2 border-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
              >
                00
              </button>
              <button
                type="button"
                onClick={() => handleCustomMultiplierKeypad('+1')}
                className="h-14 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-sm rounded-2xl border-2 border-amber-400 shadow-xs cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-sm font-black">+1</span>
                <span className="text-[9px] font-bold text-amber-800">pza</span>
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex gap-2.5 mt-4 pt-3 border-t-2 border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowNumpadModal(false);
                  setNumpadValue('');
                }}
                className="w-1/3 py-3.5 rounded-2xl border-2 border-slate-300 text-slate-800 font-black text-sm hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-custom-multiplier-btn"
                disabled={!numpadValue || parseInt(numpadValue, 10) <= 0}
                onClick={() => handleConfirmCustomMultiplierSubmit()}
                className="w-2/3 py-3.5 rounded-2xl bg-gradient-to-r from-[#D95D39] to-[#bf4c2a] hover:from-[#bf4c2a] hover:to-[#a33e20] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base shadow-md shadow-[#D95D3933] transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border-2 border-[#a33e20]"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>
                  Establecer {numpadValue || '0'} {parseInt(numpadValue, 10) === 1 ? 'Pieza' : 'Piezas'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Selector Rápido de Paleta (40, 45, 50) */}
      {showPaletaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-sm w-full border-2 border-cyan-400 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-100">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🍧</span>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">
                    Seleccionar Paleta
                  </h3>
                  <p className="text-xs text-cyan-800 font-bold">
                    Se agregarán {selectedMultiplier} {selectedMultiplier === 1 ? 'pieza' : 'piezas'}
                  </p>
                </div>
              </div>
              <button
                id="close-paleta-modal-btn"
                onClick={() => setShowPaletaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 my-4">
              {[
                { price: 40, emoji: '🍧', name: 'Paleta $40', desc: 'Agua / Fruta' },
                { price: 45, emoji: '🍧', name: 'Paleta $45', desc: 'Crema / Especial' },
                { price: 50, emoji: '🍦', name: 'Paleta $50', desc: 'Gourmet / Fina' }
              ].map((opt) => (
                <button
                  key={opt.price}
                  id={`paleta-opt-btn-${opt.price}`}
                  type="button"
                  onClick={() => {
                    handleAddPrice(opt.price, opt.name, `p_paleta_${opt.price}`);
                    setShowPaletaModal(false);
                  }}
                  className="group relative bg-gradient-to-b from-cyan-50 to-white hover:from-cyan-100 hover:to-cyan-50 border-2 border-cyan-300 hover:border-cyan-600 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer h-28"
                >
                  <span className="text-2xl mb-1">{opt.emoji}</span>
                  <span className="text-2xl font-black text-cyan-950 group-hover:text-cyan-700 tracking-tight">
                    ${opt.price}
                  </span>
                  <span className="text-[9.5px] font-extrabold text-cyan-800 mt-0.5 leading-tight">
                    {opt.desc}
                  </span>
                  {selectedMultiplier > 1 && (
                    <span className="mt-1 bg-cyan-700 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                      =${selectedMultiplier * opt.price}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPaletaModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal / Selector Rápido de Postres (Gelatina 20, Arroz con Leche 25) */}
      {showPostresModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-sm w-full border-2 border-pink-400 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🍮</span>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">
                    Seleccionar Postre
                  </h3>
                  <p className="text-xs text-pink-800 font-bold">
                    Se agregarán {selectedMultiplier} {selectedMultiplier === 1 ? 'pieza' : 'piezas'}
                  </p>
                </div>
              </div>
              <button
                id="close-postres-modal-btn"
                onClick={() => setShowPostresModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <button
                id="postre-opt-gelatina-20"
                type="button"
                onClick={() => {
                  handleAddPrice(20, 'Gelatina $20', 'p_gelatina_20');
                  setShowPostresModal(false);
                }}
                className="group relative bg-gradient-to-b from-pink-50 to-white hover:from-pink-100 hover:to-pink-50 border-2 border-pink-300 hover:border-pink-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer h-28"
              >
                <span className="text-3xl mb-1">🍮</span>
                <span className="text-2xl font-black text-pink-950 group-hover:text-pink-700 tracking-tight">
                  $20
                </span>
                <span className="text-xs font-black text-pink-900 mt-0.5">
                  Gelatina
                </span>
                {selectedMultiplier > 1 && (
                  <span className="mt-1 bg-pink-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    =${selectedMultiplier * 20}
                  </span>
                )}
              </button>

              <button
                id="postre-opt-arroz-25"
                type="button"
                onClick={() => {
                  handleAddPrice(25, 'Arroz con Leche $25', 'p_arroz_leche_25');
                  setShowPostresModal(false);
                }}
                className="group relative bg-gradient-to-b from-amber-50 to-white hover:from-amber-100 hover:to-amber-50 border-2 border-amber-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer h-28"
              >
                <span className="text-3xl mb-1">🍚</span>
                <span className="text-2xl font-black text-amber-950 group-hover:text-amber-700 tracking-tight">
                  $25
                </span>
                <span className="text-xs font-black text-amber-900 mt-0.5">
                  Arroz con Leche
                </span>
                {selectedMultiplier > 1 && (
                  <span className="mt-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    =${selectedMultiplier * 25}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPostresModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Completed Ticket Receipt Modal */}
      {completedTicket && (
        <ThermalTicket
          ticket={completedTicket}
          settings={settings}
          customerPointsBalance={selectedCustomer ? selectedCustomer.points : undefined}
          autoPrint={autoPrintTicket}
          onUpdateTicket={onUpdateTicket}
          onClose={() => setCompletedTicket(null)}
        />
      )}

      {/* Ticket Oculto en Pantalla para Impresión Directa Térmica (Visible únicamente por @media print al imprimir) */}
      {directPrintTicket && (
        <div className="hidden print:block">
          <div
            id="printable-ticket"
            className="w-full max-w-[290px] bg-white p-4 font-mono text-[12px] font-black text-black leading-tight select-none mx-auto"
            style={{ fontWeight: 900, color: '#000000' }}
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5 pb-2.5 border-b-2 border-dashed border-black">
              <div className="text-sm sm:text-base font-black tracking-wider text-black leading-tight">
                {settings.bakeryName || 'Panaderia Santa Fé el refugio'}
              </div>
              <div className="text-[11px] font-black text-black leading-tight">
                {settings.slogan || 'Pan calientito y tradicional.'}
              </div>
              <div className="text-[10.5px] font-black text-black leading-tight mt-0.5">
                {settings.address || '7:00 am a 10:00 pm'}
              </div>
              <div className="text-[11px] font-black text-black leading-tight">
                {settings.phone || '442 816 3291'}
              </div>
            </div>

            {/* Folio & Date */}
            <div className="py-2 border-b-2 border-dashed border-black text-[11px] font-black space-y-1">
              <div className="flex justify-between font-black text-black">
                <span>FOLIO: {directPrintTicket.folio}</span>
                <span>{directPrintTicket.time}</span>
              </div>
              <div className="flex justify-between text-black font-black">
                <span>FECHA: {directPrintTicket.date}</span>
                <span>CAJA: {directPrintTicket.cashier || '1'}</span>
              </div>
              {directPrintTicket.customerName && (
                <div className="pt-0.5 text-black font-black truncate">
                  CLIENTE: {directPrintTicket.customerName}
                </div>
              )}
              {directPrintTicket.customerPhone && (
                <div className="text-black font-black">
                  TEL: {directPrintTicket.customerPhone}
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="py-2.5 border-b-2 border-dashed border-black space-y-1.5 font-black">
              <div className="flex justify-between font-black text-[10px] text-black uppercase pb-1 border-b border-black">
                <span>CANT x PRECIO</span>
                <span>IMPORTE</span>
              </div>
              {directPrintTicket.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5 font-black">
                  <div className="flex justify-between items-baseline font-black text-[12px] text-black">
                    <span className="truncate pr-1">
                      {item.quantity}x ${item.price.toFixed(item.price % 1 !== 0 ? 2 : 0)}
                    </span>
                    <span className="font-black">${item.total.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] font-black text-black pl-2 truncate">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px] font-black text-black">
              <div className="flex justify-between font-black">
                <span>SUBTOTAL:</span>
                <span>${directPrintTicket.subtotal.toFixed(2)}</span>
              </div>
              {directPrintTicket.discount > 0 && (
                <div className="flex justify-between font-black">
                  <span>DESCUENTO PUNTOS:</span>
                  <span>-${directPrintTicket.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-black pt-1 border-t-2 border-black">
                <span>TOTAL:</span>
                <span className="text-base font-black">${directPrintTicket.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-black pt-0.5">
                <span>PAGO:</span>
                <span className="uppercase font-black">
                  {directPrintTicket.paymentMethod === 'efectivo' ? 'EFECTIVO' : 'TARJETA / ZETTLE'}
                </span>
              </div>
              {directPrintTicket.paymentMethod === 'tarjeta' && (
                <>
                  <div className="flex justify-between text-[10px] font-black">
                    <span>TERMINAL:</span>
                    <span>PAYPAL ZETTLE (BT)</span>
                  </div>
                  {directPrintTicket.cardAuthCode && (
                    <div className="flex justify-between text-[10px] font-black">
                      <span>AUT:</span>
                      <span>{directPrintTicket.cardAuthCode}</span>
                    </div>
                  )}
                  {directPrintTicket.cardLast4 && (
                    <div className="flex justify-between text-[10px] font-black">
                      <span>TARJETA:</span>
                      <span>**** **** **** {directPrintTicket.cardLast4}</span>
                    </div>
                  )}
                  <div className="text-[9.5px] font-black text-center py-0.5 bg-black/5 rounded">
                    OPERACION APROBADA EN LINEA
                  </div>
                </>
              )}
              {directPrintTicket.paymentMethod === 'efectivo' && directPrintTicket.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-[10.5px] font-black">
                    <span>PAGÓ CON:</span>
                    <span>${directPrintTicket.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-black">
                    <span>CAMBIO:</span>
                    <span>${directPrintTicket.change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Loyalty Points Section */}
            <div className="py-2 border-b-2 border-dashed border-black text-center space-y-1 font-black">
              <div className="text-[11px] font-black uppercase tracking-wide">
                PROGRAMA DE LEALTAD ⭐
              </div>
              <div className="text-[10.5px] font-black">
                Ganó en esta compra: +{directPrintTicket.pointsEarned} Pts (${directPrintTicket.pointsEarned} pesos)
              </div>
              <div className="text-[9.5px] font-black">
                ($20 pesos de compra = $1 peso de descuento)
              </div>
            </div>

            {/* Footer Message & Barcode */}
            <div className="pt-2 text-center space-y-1 font-black">
              <div className="text-[10px] font-black">
                {settings.ticketFooter || '¡Gracias por su compra! Vuelva pronto.'}
              </div>
              <div className="pt-1 flex flex-col items-center justify-center font-black">
                <div className="font-mono text-[9px] font-black tracking-widest text-black select-none flex space-x-0.5 items-center justify-center py-0.5">
                  ||| | |||| | || ||||| | ||| || |||| | |||
                </div>
                <span className="text-[9px] font-black text-black">{directPrintTicket.folio}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pedido Pide y Recoge (Botón Morado) */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl max-w-lg w-full border-2 border-purple-300 animate-in zoom-in-95 my-auto max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-800 to-indigo-800 text-white flex items-center justify-center shadow-md">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>Pedido Pide y Recoge</span>
                    <span className="text-base">🛍️</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Cargado desde mostrador para clientes Pide y Recoge
                  </p>
                </div>
              </div>
              <button
                id="close-order-modal-btn"
                type="button"
                onClick={handleCloseOrderModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SECCIÓN SUPERIOR: CLIENTE, TELÉFONO Y OBSERVACIONES */}
            <div className="mt-3 space-y-3">
              {/* Acceso Rápido a Clientes Favoritos Pide y Recoge (Trascos, Magda, Bollos David, Deliz) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Favoritos Pide y Recoge:
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availablePickupCustomers.map((c) => {
                    const isSelected = orderCustomerName.trim().toLowerCase() === c.name.trim().toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectOrderCustomer(c.name, c.phone, c.notes)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 border shadow-2xs active:scale-95 ${
                          isSelected
                            ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-300'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                        }`}
                      >
                        <span>🛍️</span>
                        <span>{c.name}</span>
                        {c.phone && <span className="text-[10px] opacity-75 font-normal">({c.phone.slice(-4)})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre de Cliente y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Cliente: *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="order-customer-name-input"
                      type="text"
                      required
                      placeholder="Ej. Trascos / Magda / Bollos David / Deliz"
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono (Auto-llenado):
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-purple-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="order-customer-phone-input"
                      type="tel"
                      placeholder="Ej. 4421234567"
                      value={orderCustomerPhone}
                      onChange={(e) => setOrderCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Observaciones / Notas del Pedido:
                </label>
                <textarea
                  id="order-notes-input"
                  rows={2}
                  placeholder="Ej. Entregar en bolsas de 10 piezas, pasan a las 5:00 pm, bien dorado..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {/* Fecha y Hora de Entrega en Tienda */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    <span>Fecha Entrega:</span>
                  </label>
                  <input
                    type="date"
                    value={orderDeliveryDate}
                    onChange={(e) => setOrderDeliveryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-700" />
                    <span>Hora Estimada:</span>
                  </label>
                  <input
                    type="time"
                    value={orderDeliveryTime}
                    onChange={(e) => setOrderDeliveryTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* PRODUCTOS POR ENTREGAR (Catálogo, Selecciones Rápidas y Teclado Virtual) */}
              <div className="bg-slate-50 border-2 border-purple-200/80 rounded-2xl p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-black uppercase text-purple-950 tracking-wider">
                      Productos por Entregar
                    </span>
                  </div>
                  <span className="text-xs font-black text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    {orderModalPieces} piezas
                  </span>
                </div>

                {/* 1. SELECCIONES RÁPIDAS: LOS 5 PANES MÁS SOLICITADOS EN PIDE Y RECOGE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>5 Panes Más Solicitados (Pide y Recoge):</span>
                    </span>
                    {orderCustomerRateInfo.matchedProfile && (
                      <span className="text-[9.5px] font-extrabold text-purple-700 bg-purple-100/70 px-1.5 py-0.2 rounded">
                        Tarifa: {orderCustomerRateInfo.matchedProfile.customerName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {top5PickupBreads.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => handleSelectTop5QuickBread(b)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center text-center shadow-2xs active:scale-95 ${
                          (selectedCatalogItem && selectedCatalogItem.name.toLowerCase().includes(b.key)) || orderItemNameInput.toLowerCase().includes(b.key)
                            ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-300 shadow-sm'
                            : 'bg-white hover:bg-purple-50 text-slate-800 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <span className="text-sm">{b.emoji}</span>
                        <span className="leading-tight truncate max-w-full font-bold">{b.label}</span>
                        <span className={`text-[10px] font-black ${
                          (selectedCatalogItem && selectedCatalogItem.name.toLowerCase().includes(b.key)) || orderItemNameInput.toLowerCase().includes(b.key)
                            ? 'text-amber-300'
                            : 'text-purple-700'
                        }`}>
                          ${b.resolvedPrice}.00
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. BARRA DE BÚSQUEDA DEL CATÁLOGO (AUTOCOMPLETADO AL ESCRIBIR INICIALES EJ. "TE" -> TELERA) */}
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Buscar en Catálogo o Escribir Pan:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="catalog-bread-search-input"
                      type="text"
                      placeholder="Escribe para buscar... ej. 'te' (Telera), 'bol' (Bolillo), 'con'..."
                      value={catalogItemSearch}
                      onChange={(e) => {
                        setCatalogItemSearch(e.target.value);
                        setOrderItemNameInput(e.target.value);
                        setIsSearchDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (catalogItemSearch.trim()) {
                          setIsSearchDropdownOpen(true);
                        }
                      }}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-2xs"
                    />
                    {catalogItemSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogItemSearch('');
                          setOrderItemNameInput('');
                          setSelectedCatalogItem(null);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown de opciones del catálogo al escribir */}
                  {isSearchDropdownOpen && catalogSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-purple-300 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                      <div className="p-2 bg-purple-50 text-[10px] font-black text-purple-900 uppercase flex items-center justify-between border-b border-purple-100">
                        <span>Coincidencias en Catálogo ({catalogSuggestions.length})</span>
                        <span className="text-purple-600">Toca para seleccionar</span>
                      </div>
                      {catalogSuggestions.map((item) => {
                        const price = getProductPriceForCustomer(item, orderCustomerName, 'recoger_tienda');
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectCatalogBread(item)}
                            className="p-2 hover:bg-purple-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black flex items-center justify-center shrink-0">
                                #{item.num}
                              </span>
                              <div>
                                <div className="font-black text-slate-900">{item.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {item.mainGroup} • {item.subGroup} ({item.defaultUnit})
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-purple-900 text-sm">${price}.00</span>
                              <div className="text-[9.5px] text-emerald-600 font-bold">Pide y Recoge</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. CONTROLES DE CANTIDAD, PRECIO Y TECLADO VIRTUAL */}
                <div className="bg-white border border-purple-200 rounded-xl p-2.5 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Cantidad Stepper */}
                    <div className="col-span-5 sm:col-span-4">
                      <label className="block text-[9.5px] font-black uppercase text-slate-500 mb-0.5">
                        Cantidad:
                      </label>
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setOrderItemQtyInput(prev => Math.max(1, (prev || 1) - 1))}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={orderItemQtyInput}
                          onChange={(e) => setOrderItemQtyInput(parseInt(e.target.value) || 1)}
                          className="w-full text-center font-black text-xs text-slate-900 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setOrderItemQtyInput(prev => (prev || 0) + 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Precio Unitario con Botón de Teclado Virtual Táctil */}
                    <div className="col-span-7 sm:col-span-5">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[9.5px] font-black uppercase text-slate-500">
                          Precio Unitario:
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenPriceKeypadForNewItem}
                          className="text-[9.5px] font-black text-purple-700 hover:text-purple-900 flex items-center gap-0.5 cursor-pointer bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200"
                          title="Abrir teclado virtual táctil"
                        >
                          <Calculator className="w-2.5 h-2.5" />
                          <span>Teclado</span>
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 font-bold text-slate-400 text-xs">$</span>
                        <input
                          type="text"
                          value={orderItemPriceInput}
                          onChange={(e) => setOrderItemPriceInput(e.target.value)}
                          className="w-full pl-6 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button
                          type="button"
                          onClick={handleOpenPriceKeypadForNewItem}
                          className="absolute right-1.5 p-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 cursor-pointer"
                          title="Abrir teclado numérico táctil para ingresar precio"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Botón Agregar al Pedido */}
                    <div className="col-span-12 sm:col-span-3 pt-1 sm:pt-4">
                      <button
                        id="add-bread-to-order-btn"
                        type="button"
                        onClick={handleAddProductToOrderModal}
                        className="w-full py-2 px-2 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer border border-purple-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. LISTA DE PRODUCTOS AGREGADOS AL PEDIDO */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Lista de Entrega ({orderModalItems.length} productos):
                  </div>

                  {orderModalItems.length === 0 ? (
                    <div className="p-4 rounded-xl bg-purple-50/60 border border-dashed border-purple-200 text-center space-y-1">
                      <ShoppingBag className="w-6 h-6 text-purple-400 mx-auto" />
                      <p className="text-xs font-black text-purple-900">
                        No hay productos en la lista todavía
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Usa las selecciones rápidas o busca un pan en el catálogo para agregarlo.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/80">
                      {orderModalItems.map((item, idx) => (
                        <div key={item.id || idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200/70 shadow-2xs">
                          <div className="flex items-center gap-2">
                            {/* Stepper pequeño de cantidad */}
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderModalItemQty(idx, -1)}
                                className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black text-xs text-purple-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderModalItemQty(idx, 1)}
                                className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-black text-slate-900 truncate max-w-[140px] sm:max-w-[190px]">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Precio editable con teclado virtual */}
                            <button
                              type="button"
                              onClick={() => handleOpenPriceKeypadForExistingItem(idx)}
                              className="text-[11px] font-bold text-slate-600 hover:text-purple-900 bg-slate-50 hover:bg-purple-50 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer flex items-center gap-0.5"
                              title="Modificar precio unitario con teclado virtual"
                            >
                              <span>${item.price} c/u</span>
                              <Calculator className="w-2.5 h-2.5 text-purple-600" />
                            </button>

                            <span className="font-black text-slate-900 text-xs min-w-[50px] text-right">
                              ${item.total}.00
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveOrderModalItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Eliminar del pedido"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Box */}
                  <div className="pt-2 border-t-2 border-purple-200 flex items-center justify-between px-1">
                    <span className="text-xs font-black text-purple-950 uppercase">
                      Total del Pedido ({orderModalPieces} pzs):
                    </span>
                    <span className="text-xl font-black text-purple-900">
                      ${orderModalSubtotal}.00
                    </span>
                  </div>
                </div>
              </div>

              {/* TECLADO VIRTUAL TÁCTIL (MODAL FLOTANTE PARA INGRESAR PRECIOS FÁCILMENTE) */}
              {showOrderVirtualKeypad && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
                  <div className="bg-white rounded-3xl p-4 shadow-2xl max-w-xs w-full border-2 border-purple-400 animate-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <div className="flex items-center gap-1.5 text-purple-900 font-black text-xs">
                        <Calculator className="w-4 h-4" />
                        <span>Teclado Virtual de Precio</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOrderVirtualKeypad(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Digital Screen Display */}
                    <div className="bg-slate-900 rounded-2xl p-3 text-center text-white mb-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400">
                        Precio Unitario Seleccionado
                      </div>
                      <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1 my-1">
                        <span>$</span>
                        <span>{virtualKeypadValue || '0'}</span>
                        <span className="w-0.5 h-6 bg-amber-400 animate-pulse inline-block"></span>
                      </div>
                    </div>

                    {/* Quick Add Buttons (+1, +5, +10, +0.50) */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {['+0.50', '+1', '+5', '+10'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => handleVirtualKeypadInput(btn)}
                          className="py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg text-[10px] font-black border border-purple-200 cursor-pointer active:scale-95"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>

                    {/* Numeric Keypad Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleVirtualKeypadInput(k)}
                          className="py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-purple-100 text-slate-900 font-black text-base rounded-xl border border-slate-200 cursor-pointer active:scale-95 transition-all"
                        >
                          {k}
                        </button>
                      ))}
                    </div>

                    {/* Action buttons (Clear, Backspace, Confirm) */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleVirtualKeypadInput('C')}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVirtualKeypadInput('BACKSPACE')}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmVirtualKeypad}
                        className="py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-xl cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Listo</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODALIDAD DE COBRO: PAGADO O POR COBRAR */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Modalidad de Cobro:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="order-payment-mode-pagado-btn"
                    type="button"
                    onClick={() => {
                      playBeep(750, 'sine', 0.04);
                      setOrderPaymentMode('pagado');
                    }}
                    className={`py-3 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      orderPaymentMode === 'pagado'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300 scale-101'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-black">Pagado</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-90">(Liquidó en mostrador)</span>
                  </button>

                  <button
                    id="order-payment-mode-pendiente-btn"
                    type="button"
                    onClick={() => {
                      playBeep(650, 'sine', 0.04);
                      setOrderPaymentMode('pendiente');
                    }}
                    className={`py-3 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      orderPaymentMode === 'pendiente'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300 scale-101'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-black">Por Cobrar</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-90">(Paga al recoger - Pide y Recoge)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOTONES FINALES: GENERAR PEDIDO E IMPRIMIR TICKET */}
            <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Botón 1: Generar Pedido */}
                <button
                  id="generate-store-order-btn"
                  type="button"
                  onClick={handleGenerateStoreOrder}
                  className={`py-3 px-3 rounded-2xl font-black text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border ${
                    createdOrder
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-300'
                      : 'bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white border-purple-500 hover:shadow-lg'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{createdOrder ? `✓ Pedido Generado (${createdOrder.folio})` : 'Generar Pedido 🛍️'}</span>
                </button>

                {/* Botón 2: Imprimir Ticket (Deshabilitado hasta que se genere el pedido) */}
                <button
                  id="print-store-order-ticket-btn"
                  type="button"
                  disabled={!createdOrder}
                  onClick={handlePrintStoreOrderTicket}
                  className={`py-3 px-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border ${
                    createdOrder
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-indigo-400 shadow-md hover:shadow-lg active:scale-98 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  }`}
                  title={createdOrder ? 'Imprimir ticket de Pide y Recoge' : 'Primero debes generar el pedido para poder imprimir'}
                >
                  <Printer className="w-4 h-4" />
                  <span>{createdOrder ? 'Imprimir Ticket 🖨️' : 'Imprimir Ticket'}</span>
                </button>
              </div>

              {!createdOrder ? (
                <p className="text-[10px] text-center text-slate-400 font-semibold">
                  ℹ️ Para imprimir el ticket primero haz clic en <strong className="text-purple-700">Generar Pedido</strong>
                </p>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Pedido #{createdOrder.folio} registrado!</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCloseOrderModal}
                    className="text-xs font-black text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    Cerrar y Nueva Venta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smiling Cheese Cubilete Celebration Modal (Cuando se genera pedido) */}
      {showCubileteCelebration && (
        <SmilingCheeseCubileteCelebration
          order={showCubileteCelebration}
          settings={settings}
          onPrintTicket={handlePrintStoreOrderTicket}
          onClose={() => setShowCubileteCelebration(null)}
        />
      )}

      {/* Smiling Donut Celebration Modal (Cobro sin ticket) */}
      {celebrationData && (
        <HeartBreadCelebration
          total={celebrationData.total}
          folio={celebrationData.folio}
          piecesCount={celebrationData.piecesCount}
          customerName={celebrationData.customerName}
          onClose={() => setCelebrationData(null)}
        />
      )}

      {/* Ventana Secundaria: Corte de Caja / Corte del Turno */}
      {showShiftCutModal && (
        <CashShiftCutModal
          isOpen={showShiftCutModal}
          onClose={() => setShowShiftCutModal(false)}
          tickets={tickets}
          settings={settings}
        />
      )}

      {/* Ventana de Cobro con Terminal PayPal Zettle por Bluetooth */}
      {showZettleModal && (
        <ZettleBluetoothModal
          isOpen={showZettleModal}
          amount={total}
          folio={getNextTicketFolio()}
          customerName={selectedCustomer ? selectedCustomer.name : (newCustomerName.trim() || undefined)}
          onClose={() => setShowZettleModal(false)}
          onPaymentApproved={(cardDetails) => handleZettleCardCheckout(cardDetails)}
        />
      )}
    </div>
  );
};
