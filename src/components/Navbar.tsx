import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ClipboardList, 
  Flame, 
  Truck, 
  BarChart3, 
  Settings, 
  Clock, 
  ZoomIn, 
  ZoomOut,
  Sparkles,
  Gift,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { Settings as SettingsType } from '../types';

export type ActiveTabType = 'pos' | 'orders' | 'bakers' | 'delivery' | 'loyalty' | 'history' | 'admin';

interface NavbarProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  settings: SettingsType;
  pendingOrdersCount: number;
  pendingProductionCount: number;
  pendingDeliveriesCount: number;
  zoomLevel: number;
  onToggleZoom: (delta: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  settings,
  pendingOrdersCount,
  pendingProductionCount,
  pendingDeliveriesCount,
  zoomLevel,
  onToggleZoom
}) => {
  const [currentTime, setCurrentTime] = React.useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      id: 'pos' as ActiveTabType,
      label: 'Mostrador (Vista Números)',
      shortLabel: 'Mostrador',
      icon: ShoppingBag,
      emoji: '🥖',
      description: 'Cobro rápido y teclado de números'
    },
    {
      id: 'orders' as ActiveTabType,
      label: 'Encargos / Pedidos',
      shortLabel: 'Encargos',
      icon: ClipboardList,
      emoji: '📋',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      description: 'Levantamiento de pedidos'
    },
    {
      id: 'bakers' as ActiveTabType,
      label: 'Pedidos para Panaderos',
      shortLabel: 'Panaderos',
      icon: Flame,
      emoji: '👨‍🍳',
      badge: pendingProductionCount > 0 ? pendingProductionCount : undefined,
      description: 'Producción y horneado'
    },
    {
      id: 'loyalty' as ActiveTabType,
      label: 'Club Santa Fé Puntos',
      shortLabel: 'Club Puntos',
      icon: Gift,
      emoji: '⭐',
      description: 'Puntos y descuentos clientes'
    },
    {
      id: 'delivery' as ActiveTabType,
      label: 'Repartidores',
      shortLabel: 'Repartidores',
      icon: Truck,
      emoji: '🛵',
      badge: pendingDeliveriesCount > 0 ? pendingDeliveriesCount : undefined,
      description: 'Osvaldo y Simón'
    },
    {
      id: 'history' as ActiveTabType,
      label: 'Historial & Caja',
      shortLabel: 'Historial',
      icon: BarChart3,
      emoji: '📊',
      description: 'Ventas y arqueo diario'
    },
    {
      id: 'admin' as ActiveTabType,
      label: 'Ajustes y Precios',
      shortLabel: 'Ajustes',
      icon: Settings,
      emoji: '⚙️',
      description: 'Precios y usuarios'
    }
  ];

  const currentItem = navItems.find(i => i.id === activeTab) || navItems[0];
  const totalPendingNotifications = (pendingOrdersCount || 0) + (pendingProductionCount || 0) + (pendingDeliveriesCount || 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E1DA] shadow-xs no-print">
      {/* Compact single-row navbar to fit everything in a single screen */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-1.5 flex items-center justify-between">
        
        {/* Left: Compact Logo & Branding */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-0.5 shadow-xs border border-[#E5E1DA] shrink-0 overflow-hidden flex items-center justify-center">
            <img 
              src="/logo.jpg" 
              alt="Logo Panadería Santa Fé" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif italic font-bold text-lg sm:text-xl text-[#D95D39] leading-none">
                Panadería Santa Fé
              </span>
              <span className="hidden md:inline-block text-[9px] uppercase font-bold tracking-widest text-[#D95D39] bg-[#FFF5F0] px-1.5 py-0.5 rounded border border-[#E5E1DA]">
                Tradición Artesanal
              </span>
            </div>
            <span className="hidden sm:block text-[10px] font-medium text-slate-500 leading-tight">
              {settings.slogan}
            </span>
          </div>
        </div>

        {/* Right: Desplegable Menu Button, Clock & Quick Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Main Desplegable Menu Button (Menú Desplegable Oculto) */}
          <div className="relative">
            <button
              id="view-dropdown-toggle-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D95D39] hover:bg-[#c44e2c] text-white px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer ring-2 ring-[#D95D39]/20"
              title="Abrir menú de vistas y módulos"
            >
              <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="text-base select-none">{currentItem.emoji}</span>
              <span className="font-bold tracking-tight">
                {currentItem.shortLabel}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />

              {totalPendingNotifications > 0 && (
                <span className="bg-white text-[#D95D39] text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                  {totalPendingNotifications}
                </span>
              )}
            </button>

            {/* Desplegable Popover Menu Modal */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div 
                  id="navbar-views-dropdown"
                  className="absolute right-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl shadow-2xl border-2 border-[#E5E1DA] py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                >
                  <div className="px-3.5 py-2 border-b border-[#E5E1DA] flex items-center justify-between bg-[#FAF8F6]">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      Módulos de la Panadería
                    </span>
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-2 space-y-1 max-h-[75vh] overflow-y-auto">
                    {navItems.map((item) => {
                      const isSelected = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`dropdown-item-${item.id}`}
                          onClick={() => {
                            onSelectTab(item.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#D95D39] text-white shadow-sm font-bold'
                              : 'hover:bg-[#FFF5F0] text-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="text-2xl shrink-0 select-none">{item.emoji}</span>
                            <div className="truncate">
                              <div className={`font-bold text-sm leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {item.label}
                              </div>
                              <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.description}
                              </div>
                            </div>
                          </div>

                          {item.badge !== undefined && (
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                isSelected
                                  ? 'bg-white text-[#D95D39]'
                                  : 'bg-[#D95D39] text-white animate-pulse'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Clock */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FAF8F6] px-2.5 py-1 rounded-xl border border-[#E5E1DA] text-slate-700 font-mono font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-[#D95D39]" />
            <span>{currentTime}</span>
          </div>

          {/* Accessibility text zoom controls */}
          <div className="hidden sm:flex items-center bg-[#FAF8F6] rounded-xl p-0.5 border border-[#E5E1DA]" title="Tamaño de Letra para Mayor Comodidad">
            <button
              onClick={() => onToggleZoom(-1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
              title="Reducir tamaño"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold px-1 text-slate-700">
              {zoomLevel === 0 ? 'A' : zoomLevel > 0 ? `+${zoomLevel}` : zoomLevel}
            </span>
            <button
              onClick={() => onToggleZoom(1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
              title="Aumentar tamaño de letra"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cashier Badge */}
          <div className="hidden lg:flex bg-[#FFF5F0] text-[#D95D39] font-bold text-[10px] px-2.5 py-1 rounded-xl items-center gap-1.5 border border-[#E5E1DA]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Caja Activa</span>
          </div>

        </div>
      </div>
    </header>
  );
};
