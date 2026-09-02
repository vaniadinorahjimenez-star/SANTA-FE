import {
  BreadProduct,
  SaleTicket,
  Customer,
  BakeryOrder,
  Settings,
  Driver,
  DriverCustomer,
  ProductionSheetRow,
  CashOutflowItem,
  ShiftCutRecord
} from '../types';
import { REAL_BAKERY_CATALOG, CatalogBreadItem } from '../data/bakeryCatalog';

export const DEFAULT_SETTINGS: Settings = {
  bakeryName: 'Panaderia Santa Fé el refugio',
  slogan: 'Pan calientito y tradicional.',
  phone: '442 816 3291',
  address: '7:00 am a 10:00 pm',
  ticketFooter: '¡Gracias por su preferencia! Vuelva pronto.',
  loyaltyPointsPerPesos: 20, // $20 pesos = 1 punto
  loyaltyValuePerPoint: 1, // 1 punto = $1 peso
  quickPrices: [5, 6.5, 8, 12, 15, 18, 20, 25, 30, 35],
  pinAdmin: '13579',
  adminPin: '13579',
  taxRate: 0,
  ticketPaperWidth: '58mm'
};

// Formato oficial de producción diaria / semanal (3 Hojas de Panadería Santa Fé)
export const DEFAULT_PRODUCTION_SHEET: ProductionSheetRow[] = [
  // ===================== CATEGORÍA 1: SALADO (HOJA 1) =====================
  { id: 'ps_1', category: 'Salado', breadName: 'PAN BLANCO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_2', category: 'Salado', breadName: 'CHAPATA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_3', category: 'Salado', breadName: 'BAG. HIERBAS', lun: '✓', mar: '', mier: '✓', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_4', category: 'Salado', breadName: 'BAG. AJO', lun: '✓', mar: '', mier: '✓', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_5', category: 'Salado', breadName: 'BAG. PARMESANO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_6', category: 'Salado', breadName: 'BAG. AJO C/ CHILE', lun: '✓', mar: '', mier: '✓', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_7', category: 'Salado', breadName: 'BAG. AJONJOLÍ', lun: '✓', mar: '', mier: '✓', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_8', category: 'Salado', breadName: 'FENDÚ', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_9', category: 'Salado', breadName: 'TELERA ZAJADA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_10', category: 'Salado', breadName: 'PANINIS', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_11', category: 'Salado', breadName: 'PAMBAZOS', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_12', category: 'Salado', breadName: 'BOLILLOTE', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_13', category: 'Salado', breadName: 'TELEROTA NORMAL', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_14', category: 'Salado', breadName: 'BIROTE TAPATÍO 1', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_15', category: 'Salado', breadName: 'BIROTE TAPATÍO 1.5', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_16', category: 'Salado', breadName: 'TELERA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_17', category: 'Salado', breadName: 'BAGUETTIN', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_18', category: 'Salado', breadName: 'CHAPATA C SEMILLA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },

  // ===================== CATEGORÍA 2: PAN DULCE / BIZCOCHO (HOJAS 1 Y 2) =====================
  { id: 'ps_19', category: 'Pan Dulce / Bizcocho', breadName: 'CONCHA VAINILLA', lun: 'NO', mar: '4 CH', mier: '4 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_20', category: 'Pan Dulce / Bizcocho', breadName: 'CONCHA CHOCO', lun: 'NO', mar: 'NO', mier: '3 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_21', category: 'Pan Dulce / Bizcocho', breadName: 'CONCHA GOUR', lun: '3 CH', mar: '3 CH', mier: '3 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_22', category: 'Pan Dulce / Bizcocho', breadName: 'CONCHA NUEZ', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_23', category: 'Pan Dulce / Bizcocho', breadName: 'NOVIA', lun: 'NO', mar: 'Si', mier: 'NO', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_24', category: 'Pan Dulce / Bizcocho', breadName: 'MANTECONCHA', lun: 'NO', mar: '1/2', mier: 'Si', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_25', category: 'Pan Dulce / Bizcocho', breadName: 'DONA', lun: '3 CH', mar: '3 CH', mier: '3 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_26', category: 'Pan Dulce / Bizcocho', breadName: 'HOJALDRA', lun: 'Si', mar: '', mier: 'Si', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_27', category: 'Pan Dulce / Bizcocho', breadName: 'REBANADA', lun: 'Si', mar: 'Si', mier: 'Si', juev: '', vier: '', sab: '', dom: '' },
  // Danés (incluido en Bizcochos)
  { id: 'ps_28', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'CUERNITO', lun: '3 CH', mar: '2 CH', mier: '4 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_29', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'CHOCOLATIN', lun: '1 CH', mar: '2 CH', mier: '3 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_30', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'PEINETA ZARZAMORA', lun: '8 PZ', mar: '10 PZ', mier: '10 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_31', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'PIERNA', lun: '1 y 1', mar: 'Blanca', mier: '1/2 y 1/2', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_32', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'BARQUILLO', lun: 'Si', mar: 'NO', mier: 'NO', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_33', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'ROLLO Q. CREMA', lun: 'NO', mar: '12 PZ', mier: '10 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_34', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'ROLLO DE HIGO', lun: '6 PZ', mar: '6 PZ', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_35', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'NIDO DE ARROZ', lun: 'NO', mar: 'NO', mier: 'Si', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_36', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'MOÑO', lun: 'NO', mar: 'Si', mier: 'Poco', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_37', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'BIGOTE DE CAJETA', lun: 'NO', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_38', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'BIGOTE NUEZ COCOA', lun: 'NO', mar: '6 PZ', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_39', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'ROL DE CANELA', lun: '10 PZ', mar: 'NO', mier: '8 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_40', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'ROL DE HIGO', lun: '10 PZ', mar: '10 PZ', mier: '8 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_41', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'ROL DE AVELLANA', lun: '10 PZ', mar: '15 PZ', mier: '12 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_42', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'BIGOTE AVELLANA', lun: '8 PZ', mar: '6 PZ', mier: '8 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_43', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'TRENZA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_44', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'PAN DE FERIA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_45', category: 'Pan Dulce / Bizcocho', subgroup: 'Danés', breadName: 'CUERNO MANCHEGO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },

  // ===================== CATEGORÍA 3: FEITE Y BATIDOS (HOJAS 2 Y 3) =====================
  { id: 'ps_46', category: 'Feite y Batidos', breadName: 'OJO DE CONCHA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_47', category: 'Feite y Batidos', breadName: 'OJO DE PANCHA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_48', category: 'Feite y Batidos', breadName: 'CAMPECHANA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_49', category: 'Feite y Batidos', breadName: 'OREJA', lun: 'Si', mar: 'Si', mier: '4 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_50', category: 'Feite y Batidos', breadName: 'SACRISTÁN', lun: 'Si', mar: 'NO', mier: '2 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_51', category: 'Feite y Batidos', breadName: 'ABANICO', lun: 'Si', mar: 'Si', mier: '3 CH', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_52', category: 'Feite y Batidos', breadName: 'CUADRO COCO', lun: 'Si', mar: 'Si', mier: 'NO', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_53', category: 'Feite y Batidos', breadName: 'BROCA', lun: 'NO', mar: 'NO', mier: 'NO', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_54', category: 'Feite y Batidos', breadName: 'BANDERILLA', lun: 'NO', mar: 'NO', mier: 'Si', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_55', category: 'Feite y Batidos', breadName: 'PASTEL / STRUDELL CHOCOLATE', lun: '15 PZ', mar: '15 PZ', mier: '15 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_56', category: 'Feite y Batidos', breadName: 'STRUDELL FRESA', lun: '15 PZ', mar: '15 PZ', mier: '15 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_57', category: 'Feite y Batidos', breadName: 'STRUDELL PIÑA', lun: '15 PZ', mar: '15 PZ', mier: '15 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_58', category: 'Feite y Batidos', breadName: 'STRUDELL PASTELERA', lun: '', mar: '', mier: '15 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_59', category: 'Feite y Batidos', breadName: 'STRUDELL MANZANA', lun: '10 PZ', mar: 'NO', mier: 'NO', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_60', category: 'Feite y Batidos', breadName: 'EMPANADA PIÑA', lun: '', mar: '', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_61', category: 'Feite y Batidos', breadName: 'EMPANADA ARROZ', lun: '', mar: '8 PZ', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_62', category: 'Feite y Batidos', breadName: 'EMPANADA HIGO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_63', category: 'Feite y Batidos', breadName: 'EMPANADA AVELLANA', lun: '', mar: '6 PZ', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_64', category: 'Feite y Batidos', breadName: 'EMPANADA MANZANA', lun: '', mar: '6 PZ', mier: '6 PZ', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_65', category: 'Feite y Batidos', breadName: 'CUBILETE QUESO', lun: '1 placa', mar: '1 placa', mier: '1 placa', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_66', category: 'Feite y Batidos', breadName: 'CUBILETE FRESA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_67', category: 'Feite y Batidos', breadName: 'CUBILETE PIÑA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_68', category: 'Feite y Batidos', breadName: 'CUBILETE Q. C/ NUEZ', lun: '1/2', mar: '1/2', mier: '1/2', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_69', category: 'Feite y Batidos', breadName: 'PAN DE ELOTE', lun: '1/2', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_70', category: 'Feite y Batidos', breadName: 'BERRINCHES', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_71', category: 'Feite y Batidos', breadName: 'MANTECADA', lun: '1/2', mar: 'NO', mier: '1 Placa', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_72', category: 'Feite y Batidos', breadName: 'MANTECADA CHOCO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_73', category: 'Feite y Batidos', breadName: 'CHINO', lun: 'N/P/CO/CH', mar: 'N/P/CO/CH', mier: 'N/P/CO/CH', juev: 'N/P/CO/CH', vier: 'N/P/CO/CH', sab: 'N/P/CO/CH', dom: 'N/P/CO/CH' },
  { id: 'ps_74', category: 'Feite y Batidos', breadName: 'PANQUECITO', lun: 'N/P/CO/CH', mar: 'N/P/CO/CH', mier: 'N/P/CO/CH', juev: 'N/P/CO/CH', vier: 'N/P/CO/CH', sab: 'N/P/CO/CH', dom: 'N/P/CO/CH' },
  { id: 'ps_75', category: 'Feite y Batidos', breadName: 'ROSCA', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_76', category: 'Feite y Batidos', breadName: 'PANQUÉ CHICO', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_77', category: 'Feite y Batidos', breadName: 'PANQUÉ GDE', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_78', category: 'Feite y Batidos', breadName: 'PINGÜINOS', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
  { id: 'ps_79', category: 'Feite y Batidos', breadName: 'GARIBALDI', lun: '', mar: '', mier: '', juev: '', vier: '', sab: '', dom: '' },
];

export const DEFAULT_PRODUCTS: BreadProduct[] = [
  { id: 'p4_pref', name: 'Pan Preferente $4', price: 4, category: 'Pan Dulce Tradicional' },
  { id: 'p5', name: 'Bolillo / Telera Chica $5', price: 5, category: 'Bolillo y Telera', isQuickPreset: true },
  { id: 'p5_5_pref', name: 'Pan Preferente $5.50', price: 5.5, category: 'Pan Dulce Tradicional' },
  { id: 'p6_pref', name: 'Pan Preferente $6', price: 6, category: 'Pan Dulce Tradicional' },
  { id: 'p6_5', name: 'Pan Especial / Telera $6.50', price: 6.5, category: 'Bolillo y Telera', isQuickPreset: true },
  { id: 'p7_pref', name: 'Pan Preferente $7', price: 7, category: 'Pan Dulce Tradicional' },
  { id: 'p7_5_pref', name: 'Pan Preferente $7.50', price: 7.5, category: 'Pan Dulce Tradicional' },
  { id: 'p8', name: 'Bolillo / Telera Tradicional $8', price: 8, category: 'Bolillo y Telera', isQuickPreset: true },
  { id: 'p9_pref', name: 'Pan Preferente $9', price: 9, category: 'Pan Dulce Tradicional' },
  { id: 'p11_pref', name: 'Pan Preferente $11', price: 11, category: 'Pan Dulce Tradicional' },
  { id: 'p12', name: 'Dona / Pan Dulce $12', price: 12, category: 'Pan Dulce Tradicional', isQuickPreset: true },
  { id: 'p12_5_pref', name: 'Pan Fino Preferente $12.50', price: 12.5, category: 'Pan Dulce Tradicional' },
  { id: 'p13_pref', name: 'Pan Preferente $13', price: 13, category: 'Pan Dulce Tradicional' },
  { id: 'p15', name: 'Concha / Pan Fino $15', price: 15, category: 'Pan Dulce Tradicional', isQuickPreset: true },
  { id: 'p18', name: 'Cuerno de Mantequilla $18', price: 18, category: 'Pan Dulce Tradicional', isQuickPreset: true },
  { id: 'p20', name: 'Oreja / Empanada $20', price: 20, category: 'Pan Dulce Tradicional', isQuickPreset: true },
  { id: 'p25', name: 'Panqué Individual $25', price: 25, category: 'Panqués y Galletas', isQuickPreset: true },
  { id: 'p30', name: 'Pan Relleno / Especial $30', price: 30, category: 'Panqués y Galletas', isQuickPreset: true },
  { id: 'p35_bread', name: 'Panqué Grande / Especial $35', price: 35, category: 'Panqués y Galletas', isQuickPreset: true },
  // Companion & Dairy
  { id: 'p_leche', name: 'Leche 1 Litro', price: 35, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_lechitas_18', name: 'Lechita Sabor', price: 18, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_gelatina_20', name: 'Gelatina', price: 20, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_arroz_leche_25', name: 'Arroz con Leche', price: 25, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_domo_25', name: 'Charola / Domo $25', price: 25, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_nata', name: 'Nata Artesanal', price: 90, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_queso', name: 'Queso de Rancho', price: 150, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_paleta_40', name: 'Paleta de Hielo $40', price: 40, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_paleta_45', name: 'Paleta Especial $45', price: 45, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p_paleta_50', name: 'Paleta Gourmet $50', price: 50, category: 'Lácteos y Acompañamientos', isQuickPreset: true },
  { id: 'p100', name: 'Pastel Individual / Tarta Frutas', price: 100, category: 'Pasteles y Tartas', isQuickPreset: true },
  // Extra catalog items
  { id: 'p_concha_choco', name: 'Concha Especial Chocolate', price: 15, category: 'Pan Dulce Tradicional' },
  { id: 'p_ojo_buey', name: 'Ojo de Buey', price: 12, category: 'Pan Dulce Tradicional' },
  { id: 'p_beso', name: 'Beso de Mermelada', price: 14, category: 'Pan Dulce Tradicional' },
  { id: 'p_polvoron', name: 'Polvorón Tricolor', price: 12, category: 'Panqués y Galletas' },
  { id: 'p_trenza', name: 'Trenza de Canela y Nuez', price: 22, category: 'Pan Dulce Tradicional' },
  { id: 'p_teleras_paq', name: 'Paquete de 10 Teleras', price: 75, category: 'Bolillo y Telera' },
  { id: 'p_pastel_fresa', name: 'Pastel Tres Leches con Fresa', price: 280, category: 'Pasteles y Tartas' },
  { id: 'p_empanadas_docena', name: 'Docena de Empanadas Mixtas', price: 190, category: 'Bocadillos y Empanadas' },
];

export const DEFAULT_DRIVERS: Driver[] = [
  {
    id: 'osvaldo',
    name: 'Osvaldo Morales',
    phone: '442 816 3291',
    vehicle: 'Motocicleta Itálika 125 (Placa SF-442)',
    pin: '1111',
    avatarColor: 'bg-blue-500',
    assignedCustomers: ['Esperanza', 'Paola', 'Vicky', 'Star Medica']
  },
  {
    id: 'simon',
    name: 'Simón Gómez',
    phone: '442 765 4321',
    vehicle: 'Motocicleta Vento 150 (Placa SF-881)',
    pin: '2222',
    avatarColor: 'bg-emerald-500',
    assignedCustomers: [
      'Cremeria Angeles 1',
      'Cremeria Angeles 2',
      'Chopi',
      'Ana pozo',
      'Super Rivera',
      'Aby',
      'Liz',
      'San José',
      'Miriam pozo',
      'Super'
    ]
  }
];

export const DEFAULT_DRIVER_CUSTOMERS: DriverCustomer[] = [
  // Clientes asignados a Osvaldo
  { id: 'dc_osv_1', name: 'Esperanza', driverId: 'osvaldo', customerType: 'reparto', phone: '442 110 2030', address: 'Calle Esperanza #12', defaultPayment: 'credito', notes: 'Entregar antes de las 5pm' },
  { id: 'dc_osv_2', name: 'Paola', driverId: 'osvaldo', customerType: 'reparto', phone: '442 120 3040', address: 'Fracc. El Refugio Manzana 4', defaultPayment: 'contado', notes: 'Cobro en efectivo al entregar' },
  { id: 'dc_osv_3', name: 'Vicky', driverId: 'osvaldo', customerType: 'reparto', phone: '442 130 4050', address: 'Av. Paseo San José #88', defaultPayment: 'credito', notes: 'Pago a fin de mes' },
  { id: 'dc_osv_4', name: 'Star Medica', driverId: 'osvaldo', customerType: 'reparto', phone: '442 140 5060', address: 'Hospital Star Médica Querétaro', defaultPayment: 'credito', notes: 'Facturación a fin de mes / Área de Comedor' },

  // Clientes asignados a Simón
  { id: 'dc_sim_1', name: 'Cremeria Angeles 1', driverId: 'simon', customerType: 'reparto', phone: '442 210 1100', address: 'Mercado Local 45 (Sucursal 1)', defaultPayment: 'credito', notes: 'Bolillos y teleras saladas temprano' },
  { id: 'dc_sim_2', name: 'Cremeria Angeles 2', driverId: 'simon', customerType: 'reparto', phone: '442 220 2200', address: 'Av. Zaragoza #304 (Sucursal 2)', defaultPayment: 'credito', notes: 'Crédito semanal / fin de mes' },
  { id: 'dc_sim_3', name: 'Chopi', driverId: 'simon', customerType: 'reparto', phone: '442 230 3300', address: 'Abarrotes Chopi', defaultPayment: 'credito', notes: 'Entrega por la mañana' },
  { id: 'dc_sim_4', name: 'Ana pozo', driverId: 'simon', customerType: 'reparto', phone: '442 240 4400', address: 'Comercial El Pozo Local 3', defaultPayment: 'credito', notes: 'Pan blanco y charolas' },
  { id: 'dc_sim_5', name: 'Super Rivera', driverId: 'simon', customerType: 'reparto', phone: '442 250 5500', address: 'Supermercado Rivera Blvd.', defaultPayment: 'credito', notes: 'Revisión y firma con encargado' },
  { id: 'dc_sim_6', name: 'Aby', driverId: 'simon', customerType: 'reparto', phone: '442 260 6600', address: 'Tienda Aby', defaultPayment: 'contado', notes: 'Pago inmediato' },
  { id: 'dc_sim_7', name: 'Liz', driverId: 'simon', customerType: 'reparto', phone: '442 270 7700', address: 'Panificadora Liz / Local 8', defaultPayment: 'contado', notes: 'Entrega en mostrador' },
  { id: 'dc_sim_8', name: 'San José', driverId: 'simon', customerType: 'reparto', phone: '442 280 8800', address: 'Abarrotes y Cremería San José', defaultPayment: 'credito', notes: 'Crédito quincenal / fin de mes' },
  { id: 'dc_sim_9', name: 'Miriam pozo', driverId: 'simon', customerType: 'reparto', phone: '442 290 9900', address: 'Local Miriam Pozo', defaultPayment: 'credito', notes: 'Pedido fijo de bolillo y dulce' },
  { id: 'dc_sim_10', name: 'Super', driverId: 'simon', customerType: 'reparto', phone: '442 299 0011', address: 'Mini Super Express Central', defaultPayment: 'credito', notes: 'Corte comercial fin de mes' },

  // Clientes de Mostrador para Pide y Recoge (Trascos, Magda, Bollos David, Deliz)
  { id: 'dc_pk_1', name: 'Trascos', driverId: 'tienda', customerType: 'recoger_tienda', phone: '442 331 4455', address: 'Pide y Recoge en mostrador sucursal', defaultPayment: 'credito', notes: 'Taquería Trascos - Pide y Recoge en tienda por la tarde' },
  { id: 'dc_pk_2', name: 'Magda', driverId: 'tienda', customerType: 'recoger_tienda', phone: '442 332 5566', address: 'Pide y Recoge en mostrador sucursal', defaultPayment: 'contado', notes: 'Doña Magda - Pasa a recoger pan dulce temprano' },
  { id: 'dc_pk_3', name: 'Bollos David', driverId: 'tienda', customerType: 'recoger_tienda', phone: '442 333 6677', address: 'Pide y Recoge en mostrador sucursal', defaultPayment: 'credito', notes: 'Bollos para hamburguesa y pan artesanal / Pasan por él' },
  { id: 'dc_pk_4', name: 'Deliz', driverId: 'tienda', customerType: 'recoger_tienda', phone: '442 334 7788', address: 'Pide y Recoge en mostrador sucursal', defaultPayment: 'credito', notes: 'Café & Deliz - Pide y Recoge con pedido programado' },
];

// Helper to get today's date formatted as YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNowTimeString(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

// Convertir hora tipo "02:30 PM" o "14:30" a minutos del día
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM') || str.includes('P.M.');
  const isAM = str.includes('AM') || str.includes('A.M.');
  
  const clean = str.replace(/[^0-9:]/g, '');
  const parts = clean.split(':');
  let h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  
  return h * 60 + m;
}

// Determina el turno por horario estándar:
// Turno 1: 06:50 AM (410 mins) a 15:00 HRS (900 mins)
// Turno 2: 15:01 HRS (901 mins) a 22:10 HRS (1330 mins)
export function getTicketShiftByTime(timeStr: string): 'turno1' | 'turno2' {
  const mins = parseTimeToMinutes(timeStr);
  if (mins >= 410 && mins <= 900) {
    return 'turno1';
  }
  if (mins > 900 && mins <= 1330) {
    return 'turno2';
  }
  if (mins < 410) {
    return 'turno1';
  }
  return 'turno2';
}

// Resuelve el turno de un ticket: respeta el shift manual registrado primero, con respaldo por hora
export function resolveTicketShift(ticket: { shift?: 'turno1' | 'turno2'; time?: string }): 'turno1' | 'turno2' {
  if (ticket.shift === 'turno1' || ticket.shift === 'turno2') {
    return ticket.shift;
  }
  return getTicketShiftByTime(ticket.time || '');
}

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Doña Carmen Ramírez', phone: '5511223344', points: 35, totalSpent: 700, visitsCount: 14, lastVisit: getTodayString() },
  { id: 'c2', name: 'Sr. Roberto Vargas', phone: '5522334455', points: 60, totalSpent: 1200, visitsCount: 8, lastVisit: getTodayString() },
  { id: 'c3', name: 'Dra. María Elena Garza', phone: '5533445566', points: 15, totalSpent: 300, visitsCount: 3, lastVisit: getTodayString() },
  { id: 'c4', name: 'Ing. Gabriel Torres', phone: '5544556677', points: 45, totalSpent: 900, visitsCount: 11, lastVisit: getTodayString() },
  { id: 'c5', name: 'Lucía Mendoza (Cafetería)', phone: '5555667788', points: 120, totalSpent: 2400, visitsCount: 20, lastVisit: getTodayString() },
];

export const INITIAL_ORDERS: BakeryOrder[] = [
  {
    id: 'ord-101',
    folio: 'PED-0101',
    customerName: 'Doña Carmen Ramírez',
    customerPhone: '5511223344',
    deliveryType: 'domicilio',
    address: 'Calle Las Rosas #45, Col. Lindavista (Casa portón blanco)',
    deliveryDate: getTodayString(),
    deliveryTime: '16:00',
    items: [
      { breadId: 'p10', name: 'Concha Vainilla', category: 'Pan Dulce Tradicional', quantity: 20, unitPrice: 10, total: 200, done: true },
      { breadId: 'p18', name: 'Cuerno de Mantequilla', category: 'Pan Dulce Tradicional', quantity: 15, unitPrice: 18, total: 270, done: true },
      { breadId: 'p8', name: 'Bolillo Tradicional', category: 'Bolillo y Telera', quantity: 30, unitPrice: 8, total: 240, done: false },
    ],
    total: 710,
    deposit: 300,
    pendingAmount: 410,
    paymentStatus: 'anticipo',
    assignedDriverId: 'osvaldo',
    deliveryStatus: 'pendiente',
    notes: 'Empacar los bolillos en bolsa de papel separada por favor.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    coordinates: { lat: 19.4892, lng: -99.1245 },
    isMonthlyCredit: false,
    requiresInvoice: false,
    invoiceStatus: 'no_requerida'
  },
  {
    id: 'ord-102',
    folio: 'PED-0102',
    customerName: 'Restaurante Los Portales (Sr. Roberto)',
    customerPhone: '5522334455',
    deliveryType: 'domicilio',
    address: 'Av. Juárez #210, Zona Centro (Entregar por cocina)',
    deliveryDate: getTodayString(),
    deliveryTime: '17:30',
    items: [
      { breadId: 'p8', name: 'Telera para Torta', category: 'Bolillo y Telera', quantity: 80, unitPrice: 8, total: 640, done: true },
      { breadId: 'p35', name: 'Baguette Rústica', category: 'Bolillo y Telera', quantity: 10, unitPrice: 35, total: 350, done: false },
    ],
    total: 990,
    deposit: 0,
    pendingAmount: 990,
    paymentStatus: 'pendiente',
    assignedDriverId: 'simon',
    deliveryStatus: 'pendiente',
    notes: 'Paga a fin de mes. Enviar factura con remisiones.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    coordinates: { lat: 19.4342, lng: -99.1415 },
    isMonthlyCredit: true,
    requiresInvoice: true,
    invoiceStatus: 'facturado',
    invoiceFolio: 'FAC-2024-089',
    rfc: 'RLP880412XYZ',
    businessName: 'Restaurante Los Portales S.A. de C.V.',
    cfdiUse: 'G03 - Gastos en general'
  },
  {
    id: 'ord-103',
    folio: 'PED-0103',
    customerName: 'Cafetería La Esquina / Lucía Mendoza',
    customerPhone: '5555667788',
    deliveryType: 'tienda',
    address: 'Mostrador / Tienda',
    deliveryDate: getTodayString(),
    deliveryTime: '08:30',
    items: [
      { breadId: 'p10', name: 'Concha Chocolate', category: 'Pan Dulce Tradicional', quantity: 30, unitPrice: 10, total: 300, done: true },
      { breadId: 'p18', name: 'Cuerno de Mantequilla', category: 'Pan Dulce Tradicional', quantity: 20, unitPrice: 18, total: 360, done: true },
    ],
    total: 660,
    deposit: 0,
    pendingAmount: 660,
    paymentStatus: 'pendiente',
    assignedDriverId: 'ninguno',
    deliveryStatus: 'entregado',
    notes: 'Cliente con convenio de pago a fin de mes. Pasa por el pan en la mañana.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isMonthlyCredit: true,
    requiresInvoice: true,
    invoiceStatus: 'pendiente',
    rfc: 'MEL920315ABC',
    businessName: 'Lucía Elena Mendoza Cafeterías',
    cfdiUse: 'G03 - Gastos en general'
  },
  {
    id: 'ord-104',
    folio: 'PED-0104',
    customerName: 'Profra. Patricia Solís',
    customerPhone: '5566778899',
    deliveryType: 'tienda',
    address: 'Recoge en Tienda / Mostrador',
    deliveryDate: getTodayString(),
    deliveryTime: '19:00',
    items: [
      { breadId: 'p90', name: 'Rosca de Reyes Mediana Tradicional', category: 'Roscas y Especiales', quantity: 1, unitPrice: 90, total: 90, done: true },
      { breadId: 'p12', name: 'Donas de Chocolate y Canela', category: 'Pan Dulce Tradicional', quantity: 10, unitPrice: 12, total: 120, done: true },
    ],
    total: 210,
    deposit: 0,
    pendingAmount: 210,
    paymentStatus: 'pendiente',
    assignedDriverId: 'ninguno',
    deliveryStatus: 'pendiente',
    notes: 'Recoge a las 7:00 PM después del trabajo.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    isMonthlyCredit: false,
    requiresInvoice: false,
    invoiceStatus: 'no_requerida'
  },
  {
    id: 'ord-105',
    folio: 'PED-0105',
    customerName: 'Hospital Santa María (Cafetería)',
    customerPhone: '5577889900',
    deliveryType: 'domicilio',
    address: 'Calzada México Tacuba #890',
    deliveryDate: getTodayString(),
    deliveryTime: '15:00',
    items: [
      { breadId: 'p10', name: 'Conchas Surtidas', category: 'Pan Dulce Tradicional', quantity: 40, unitPrice: 10, total: 400, done: true },
      { breadId: 'p25', name: 'Panqués de Nuez', category: 'Panqués y Galletas', quantity: 10, unitPrice: 25, total: 250, done: true },
    ],
    total: 650,
    deposit: 0,
    pendingAmount: 650,
    paymentStatus: 'pendiente',
    assignedDriverId: 'simon',
    deliveryStatus: 'entregado',
    collectedAmount: 0,
    deliveredAt: new Date(Date.now() - 3600000).toISOString(),
    notes: 'Entregado a recepcionista Lucero. Corte mensual a pagar el día 30.',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    coordinates: { lat: 19.4520, lng: -99.1820 },
    isMonthlyCredit: true,
    requiresInvoice: true,
    invoiceStatus: 'pendiente',
    rfc: 'HSM700819KJ1',
    businessName: 'Hospital Santa María Servicios Médicos S.A.',
    cfdiUse: 'G03 - Gastos en general'
  }
];

export const INITIAL_TICKETS: SaleTicket[] = [
  {
    id: 't-1001',
    folio: 'T-001001',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    date: getTodayString(),
    time: '08:30',
    items: [
      { id: 'i1', name: 'Pan Dulce $10', price: 10, quantity: 5, total: 50 },
      { id: 'i2', name: 'Bolillo $8', price: 8, quantity: 10, total: 80 },
    ],
    subtotal: 130,
    discount: 0,
    total: 130,
    paymentMethod: 'efectivo',
    amountPaid: 150,
    change: 20,
    customerName: 'Doña Carmen Ramírez',
    customerPhone: '5511223344',
    pointsEarned: 6,
    pointsRedeemed: 0,
    cashier: 'Mostrador 1'
  },
  {
    id: 't-1002',
    folio: 'T-001002',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    date: getTodayString(),
    time: '09:45',
    items: [
      { id: 'i3', name: 'Pastel 3 Leches $150', price: 150, quantity: 1, total: 150 },
      { id: 'i4', name: 'Cuerno $18', price: 18, quantity: 4, total: 72 },
    ],
    subtotal: 222,
    discount: 10,
    total: 212,
    paymentMethod: 'tarjeta',
    amountPaid: 212,
    change: 0,
    customerName: 'Sr. Roberto Vargas',
    customerPhone: '5522334455',
    pointsEarned: 10,
    pointsRedeemed: 10,
    cashier: 'Mostrador 1'
  },
  {
    id: 't-1003',
    folio: 'T-001003',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    date: getTodayString(),
    time: '11:15',
    items: [
      { id: 'i5', name: 'Pan Dulce $12', price: 12, quantity: 6, total: 72 },
      { id: 'i6', name: 'Orejas $20', price: 20, quantity: 3, total: 60 },
    ],
    subtotal: 132,
    discount: 0,
    total: 132,
    paymentMethod: 'efectivo',
    amountPaid: 200,
    change: 68,
    pointsEarned: 6,
    pointsRedeemed: 0,
    cashier: 'Mostrador 1'
  },
  {
    id: 't-1004',
    folio: 'T-001004',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    date: getTodayString(),
    time: '12:40',
    items: [
      { id: 'i7', name: 'Rosca Mediana $90', price: 90, quantity: 1, total: 90 },
      { id: 'i8', name: 'Panqué Nuez $25', price: 25, quantity: 2, total: 50 },
    ],
    subtotal: 140,
    discount: 0,
    total: 140,
    paymentMethod: 'tarjeta',
    amountPaid: 140,
    change: 0,
    customerName: 'Dra. María Elena Garza',
    customerPhone: '5533445566',
    pointsEarned: 7,
    pointsRedeemed: 0,
    cashier: 'Mostrador 1'
  }
];

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'santafe_settings_v1',
  PRODUCTS: 'santafe_products_v1',
  TICKETS: 'santafe_tickets_v1',
  CUSTOMERS: 'santafe_customers_v1',
  ORDERS: 'santafe_orders_v1',
  DRIVERS: 'santafe_drivers_v1',
  DRIVER_CUSTOMERS: 'santafe_driver_customers_v1',
  PRODUCTION_SHEET: 'santafe_production_sheet_v1',
  NEXT_TICKET_NUM: 'santafe_next_ticket_num_v1',
  NEXT_ORDER_NUM: 'santafe_next_order_num_v1',
  OUTFLOWS: 'santafe_outflows_v1',
  SHIFT_CUTS: 'santafe_shift_cuts_v1',
  NEXT_CUT_NUM: 'santafe_next_cut_num_v1',
  MASTER_CATALOG: 'santafe_master_catalog_v2'
};

export function loadMasterCatalog(): CatalogBreadItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_CATALOG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading master catalog', e);
  }
  return REAL_BAKERY_CATALOG;
}

export function saveMasterCatalog(catalog: CatalogBreadItem[]): void {
  localStorage.setItem(STORAGE_KEYS.MASTER_CATALOG, JSON.stringify(catalog));
}

export function loadProductionSheet(): ProductionSheetRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SHEET);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading production sheet', e);
  }
  return DEFAULT_PRODUCTION_SHEET;
}

export function saveProductionSheet(rows: ProductionSheetRow[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTION_SHEET, JSON.stringify(rows));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old default address/name/slogan if still present
      if (!parsed.bakeryName || parsed.bakeryName === 'Panadería Santa Fé' || parsed.bakeryName.includes('"El Refugio"')) {
        parsed.bakeryName = DEFAULT_SETTINGS.bakeryName;
      }
      if (!parsed.slogan || parsed.slogan.includes('Abierto') || parsed.slogan.includes('Tradición Artesanal')) {
        parsed.slogan = DEFAULT_SETTINGS.slogan;
      }
      if (!parsed.address || parsed.address.includes('Campo Real') || parsed.address.includes('Hidalgo')) {
        parsed.address = DEFAULT_SETTINGS.address;
      }
      if (!parsed.phone || parsed.phone.includes('1234')) {
        parsed.phone = DEFAULT_SETTINGS.phone;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadProducts(): BreadProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading products', e);
  }
  return DEFAULT_PRODUCTS;
}

export function saveProducts(products: BreadProduct[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function loadTickets(): SaleTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading tickets', e);
  }
  return INITIAL_TICKETS;
}

export function saveTickets(tickets: SaleTicket[]): void {
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
}

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading customers', e);
  }
  return INITIAL_CUSTOMERS;
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function loadOrders(): BakeryOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading orders', e);
  }
  return INITIAL_ORDERS;
}

export function saveOrders(orders: BakeryOrder[]): void {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function loadDrivers(): Driver[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading drivers', e);
  }
  return DEFAULT_DRIVERS;
}

export function saveDrivers(drivers: Driver[]): void {
  localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
}

export function loadDriverCustomers(): DriverCustomer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVER_CUSTOMERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize Tarascos -> Trascos
        return parsed.map((c: DriverCustomer) => {
          if (c.name === 'Tarascos') {
            return { ...c, name: 'Trascos' };
          }
          return c;
        });
      }
    }
  } catch (e) {
    console.error('Error loading driver customers', e);
  }
  return DEFAULT_DRIVER_CUSTOMERS;
}

export function saveDriverCustomers(customers: DriverCustomer[]): void {
  localStorage.setItem(STORAGE_KEYS.DRIVER_CUSTOMERS, JSON.stringify(customers));
}

export function getNextTicketFolio(): string {
  let num = 1005;
  try {
    const current = localStorage.getItem(STORAGE_KEYS.NEXT_TICKET_NUM);
    if (current) {
      num = parseInt(current, 10);
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.NEXT_TICKET_NUM, (num + 1).toString());
  return `T-${String(num).padStart(6, '0')}`;
}

export function getNextOrderFolio(): string {
  let num = 106;
  try {
    const current = localStorage.getItem(STORAGE_KEYS.NEXT_ORDER_NUM);
    if (current) {
      num = parseInt(current, 10);
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.NEXT_ORDER_NUM, (num + 1).toString());
  return `PED-${String(num).padStart(4, '0')}`;
}

export function getNextShiftCutFolio(): string {
  let num = 101;
  try {
    const current = localStorage.getItem(STORAGE_KEYS.NEXT_CUT_NUM);
    if (current) {
      num = parseInt(current, 10);
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.NEXT_CUT_NUM, (num + 1).toString());
  return `CORTE-${String(num).padStart(4, '0')}`;
}

export function loadOutflows(): CashOutflowItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OUTFLOWS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading outflows', e);
  }
  return [];
}

export function saveOutflows(outflows: CashOutflowItem[]): void {
  localStorage.setItem(STORAGE_KEYS.OUTFLOWS, JSON.stringify(outflows));
}

export function loadShiftCuts(): ShiftCutRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHIFT_CUTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading shift cuts', e);
  }
  return [];
}

export function saveShiftCuts(cuts: ShiftCutRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.SHIFT_CUTS, JSON.stringify(cuts));
}

// Generate formatted WhatsApp message for Shift Cut
export function generateShiftCutWhatsAppMessage(cut: ShiftCutRecord, settings: Settings): string {
  const outflowsText = cut.outflows && cut.outflows.length > 0
    ? cut.outflows.map(o => `  • ${o.concept}: -$${o.amount}.00 (${o.time})`).join('\n')
    : '  (Sin salidas registradas)';

  let text = `🥖 *${settings.bakeryName}* 🥖\n`;
  text += `📊 *CORTE DE CAJA / TURNO:* ${cut.folio}\n`;
  text += `👤 *Cajero(a):* ${cut.cashierName}\n`;
  text += `🕒 *Turno:* ${cut.shiftName}\n`;
  text += `📅 *Fecha:* ${cut.date} | *Hora:* ${cut.time}\n`;
  text += `--------------------------------\n`;
  text += `*RESUMEN DE VENTAS:*\n`;
  text += `• Total Bruto de Ventas: *$${cut.totalGrossSales}.00*\n`;
  text += `• Ventas en Efectivo: $${cut.totalCashSales}.00\n`;
  text += `• Ventas con Tarjeta: $${cut.totalCardSales}.00${cut.isCardManualOverride ? ' (Manual)' : ''}\n`;
  if (cut.totalBreadSales !== undefined || cut.totalNonBreadSales !== undefined) {
    text += `--------------------------------\n`;
    text += `*DESGLOSE PAN VS OTROS:*\n`;
    text += `🥖 *Venta de Pan:* $${cut.totalBreadSales || 0}.00 (${cut.breadPieces || 0} pzs)\n`;
    text += `🥛 *Venta de Otros (No Pan):* $${cut.totalNonBreadSales || 0}.00 (${cut.nonBreadPieces || 0} arts)\n`;
    if (cut.nonBreadItems && cut.nonBreadItems.length > 0) {
      text += `*Artículos No Pan Vendidos:*\n`;
      cut.nonBreadItems.forEach(item => {
        text += `  • ${item.name} (${item.quantity} pz): $${item.total}.00\n`;
      });
    }
  }
  text += `• Total Piezas: ${cut.totalPieces} pzs\n`;
  text += `• Total de Tickets: ${cut.ticketsCount} tickets\n`;
  text += `--------------------------------\n`;
  text += `*SALIDAS / PAGOS A PROVEEDORES:*\n`;
  text += `${outflowsText}\n`;
  const finalDeliver = cut.cashToDeliver !== undefined
    ? cut.cashToDeliver
    : (cut.nextShiftCash ? Math.max(0, cut.expectedCashInDrawer - cut.nextShiftCash) : cut.expectedCashInDrawer);

  text += `• Total Salidas: *-$${cut.totalOutflows}.00*\n`;
  text += `--------------------------------\n`;
  text += `*BALANCE DE CAJA:*\n`;
  text += `(+) Fondo Inicial: $${cut.initialCash}.00\n`;
  text += `(+) Efectivo Cobrado: $${cut.totalCashSales}.00\n`;
  text += `(-) Salidas Proveedores: -$${cut.totalOutflows}.00\n`;
  text += `(=) Total en Cajón: $${cut.expectedCashInDrawer}.00\n`;
  if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
    text += `(-) Se Deja para Sig. Turno: -$${cut.nextShiftCash}.00\n`;
  }
  text += `👉 *EFECTIVO NETO A ENTREGAR: $${finalDeliver}.00*\n`;
  if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
    text += `ℹ️ _(Quedan $${cut.nextShiftCash}.00 en caja para cambio del sig. turno)_\n`;
  }
  if (cut.actualCashInDrawer !== undefined) {
    text += `💵 Conteo Físico Real: $${cut.actualCashInDrawer}.00\n`;
    if (cut.nextShiftCash !== undefined && cut.nextShiftCash > 0) {
      text += `💰 Real a Retirar: $${Math.max(0, cut.actualCashInDrawer - cut.nextShiftCash)}.00\n`;
    }
    if (cut.difference !== undefined && cut.difference !== 0) {
      text += `⚖️ Diferencia: ${cut.difference > 0 ? `+$${cut.difference}.00 (Sobrante)` : `-$${Math.abs(cut.difference)}.00 (Faltante)`}\n`;
    }
  }
  if (cut.notes) {
    text += `📝 Observaciones: ${cut.notes}\n`;
  }
  text += `\n_${settings.ticketFooter}_`;

  return encodeURIComponent(text);
}

// Generate formatted WhatsApp message for Ticket
export function generateTicketWhatsAppMessage(ticket: SaleTicket, settings: Settings, customerPointsBalance?: number): string {
  const itemsText = ticket.items
    .map(it => `• ${it.quantity}x $${it.price} = $${it.total} pesos (${it.name})`)
    .join('\n');

  let text = `🥖 *${settings.bakeryName}* 🥖\n`;
  text += `_${settings.slogan}_\n`;
  text += `📍 ${settings.address}\n`;
  text += `📞 Tel: ${settings.phone}\n`;
  text += `--------------------------------\n`;
  text += `🧾 *TICKET:* ${ticket.folio}\n`;
  text += `📅 Fecha: ${ticket.date}  🕒 Hora: ${ticket.time}\n`;
  if (ticket.customerName) {
    text += `👤 Cliente: ${ticket.customerName}\n`;
  }
  text += `--------------------------------\n`;
  text += `*DETALLE DE COMPRA:*\n`;
  text += `${itemsText}\n`;
  text += `--------------------------------\n`;
  text += `Subtotal: $${ticket.subtotal}.00\n`;
  if (ticket.discount > 0) {
    text += `Descuento (Puntos): -$${ticket.discount}.00\n`;
  }
  text += `*TOTAL PAGADO: $${ticket.total}.00*\n`;
  text += `Método: ${ticket.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}\n`;
  if (ticket.paymentMethod === 'efectivo' && ticket.amountPaid > 0) {
    text += `Pagó con: $${ticket.amountPaid}.00 | Cambio: $${ticket.change}.00\n`;
  }
  text += `--------------------------------\n`;
  text += `⭐ *PUNTOS DE LEALTAD:*\n`;
  text += `+ Puntos ganados hoy: +${ticket.pointsEarned} pts ($${ticket.pointsEarned} pesos)\n`;
  if (customerPointsBalance !== undefined) {
    text += `🪙 Saldo actual disponible: *${customerPointsBalance} puntos ($${customerPointsBalance} pesos)*\n`;
  }
  text += `\n_${settings.ticketFooter}_\n`;

  return encodeURIComponent(text);
}

// Generate formatted WhatsApp message for Bakery Order
export function generateOrderWhatsAppMessage(order: BakeryOrder, settings: Settings): string {
  const itemsText = order.items
    .map(it => `• ${it.quantity}x ${it.name} ($${it.unitPrice} c/u) = $${it.total}`)
    .join('\n');

  let text = `🥖 *${settings.bakeryName} - CONFIRMACIÓN DE PEDIDO* 🥖\n`;
  text += `--------------------------------\n`;
  text += `📋 *FOLIO:* ${order.folio}\n`;
  text += `👤 Cliente: ${order.customerName}\n`;
  text += `📅 *Fecha de Entrega:* ${order.deliveryDate}\n`;
  text += `⏰ *Hora Estimada:* ${order.deliveryTime}\n`;
  text += `📍 *Modalidad:* ${order.deliveryType === 'domicilio' ? `🛵 Entrega a Domicilio: ${order.address}` : '🏬 Pide y Recoge en Tienda'}\n`;
  text += `--------------------------------\n`;
  text += `*PRODUCTOS SOLICITADOS:*\n`;
  text += `${itemsText}\n`;
  text += `--------------------------------\n`;
  text += `*TOTAL DEL PEDIDO: $${order.total}.00*\n`;
  text += `Anticipo recibido: $${order.deposit}.00\n`;
  text += `*SALDO PENDIENTE A LIQUIDAR: $${order.pendingAmount}.00*\n`;
  if (order.notes) {
    text += `📝 *Nota:* ${order.notes}\n`;
  }
  text += `\n_${settings.ticketFooter}_`;

  return encodeURIComponent(text);
}
