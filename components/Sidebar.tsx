import React, { useEffect, useState } from 'react';
import { ViewState, User, MenuConfigItem } from '../types';
import { LayoutDashboard, ShoppingCart, Users, Package, Wallet, LogOut, UserCog, Settings, Layout, FolderOpen, List, ChevronDown, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Database, Clock, BarChart3, Scale } from 'lucide-react';
import { logout, getMenuConfig } from '../services/db';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  currentUser: User | null;
}

// Map ViewState to Icons and default labels
const MENU_META: Record<string, { label: string, icon: any, protected: boolean }> = {
    [ViewState.DASHBOARD]: { label: 'Tổng quan', icon: LayoutDashboard, protected: true },
    [ViewState.SALES]: { label: 'Bán hàng', icon: ShoppingCart, protected: false },
    [ViewState.REPORTS]: { label: 'Báo cáo', icon: BarChart3, protected: true }, // New
    [ViewState.INVENTORY]: { label: 'Kho hàng', icon: Package, protected: false }, // Parent Concept
    [ViewState.CATEGORIES]: { label: 'Danh mục', icon: FolderOpen, protected: false }, // Child
    [ViewState.UNITS]: { label: 'Đơn vị tính', icon: Scale, protected: false }, // Child
    [ViewState.IMPORT_STOCK]: { label: 'Nhập kho', icon: ArrowDownToLine, protected: false }, // Child
    [ViewState.EXPORT_STOCK]: { label: 'Xuất kho', icon: ArrowUpFromLine, protected: false }, // Child
    [ViewState.CUSTOMERS]: { label: 'Khách hàng', icon: Users, protected: false },
    [ViewState.DEBT]: { label: 'Công nợ', icon: Wallet, protected: true },
    [ViewState.DATA_SYNC]: { label: 'Dữ liệu', icon: Database, protected: true },
    [ViewState.USERS]: { label: 'Nhân viên', icon: UserCog, protected: true },
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [menuConfig, setMenuConfig] = useState<MenuConfigItem[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadMenu = () => {
      setMenuConfig(getMenuConfig());
  };

  useEffect(() => {
      loadMenu();
      window.addEventListener('menu-config-change', loadMenu);
      
      // Clock timer
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => {
        window.removeEventListener('menu-config-change', loadMenu);
        clearInterval(timer);
      };
  }, []);

  // Check visibility for sub-menus
  const isCategoryVisible = menuConfig.find(m => m.id === ViewState.CATEGORIES)?.isVisible;
  const isUnitVisible = menuConfig.find(m => m.id === ViewState.UNITS)?.isVisible;
  const isImportVisible = menuConfig.find(m => m.id === ViewState.IMPORT_STOCK)?.isVisible;
  const isExportVisible = menuConfig.find(m => m.id === ViewState.EXPORT_STOCK)?.isVisible;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out flex flex-col
          md:translate-x-0 md:static md:inset-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-center border-b border-slate-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Sales Manager
          </h1>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                    {currentUser?.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{currentUser?.name}</p>
                    <p className="text-xs text-slate-400 uppercase">{currentUser?.role}</p>
                </div>
            </div>
        </div>

        <nav className="flex-1 mt-4 px-2 overflow-y-auto no-scrollbar">
          {menuConfig.map((configItem) => {
            if (!configItem.isVisible) return null;
            
            // Skip rendering children here because they are rendered inside INVENTORY
            if ([ViewState.CATEGORIES, ViewState.UNITS, ViewState.IMPORT_STOCK, ViewState.EXPORT_STOCK].includes(configItem.id as ViewState)) return null;

            // Check permissions
            const meta = MENU_META[configItem.id];
            if (!meta) return null;
            if (meta.protected && !isAdmin) return null;

            // SPECIAL CASE: INVENTORY (Render as Group)
            if (configItem.id === ViewState.INVENTORY) {
                const isActiveParent = [
                    ViewState.INVENTORY, 
                    ViewState.CATEGORIES,
                    ViewState.UNITS,
                    ViewState.IMPORT_STOCK, 
                    ViewState.EXPORT_STOCK
                ].includes(currentView);
                
                return (
                    <div key={configItem.id} className="mb-2">
                        <button
                            onClick={() => setInventoryOpen(!inventoryOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                                isActiveParent ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                           <div className="flex items-center">
                                <Package className="mr-3 h-5 w-5" />
                                <span className="font-medium">Kho hàng</span>
                           </div>
                           {inventoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {inventoryOpen && (
                            <div className="mt-1 space-y-1">
                                {/* Product List Sub-item */}
                                <button
                                    onClick={() => {
                                        onChangeView(ViewState.INVENTORY);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center pl-12 pr-4 py-2 rounded-lg text-sm transition-colors ${
                                        currentView === ViewState.INVENTORY
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <List className="mr-3 h-4 w-4" />
                                    <span>Danh sách SP</span>
                                </button>

                                {/* Import Stock */}
                                {isImportVisible && (
                                    <button
                                        onClick={() => {
                                            onChangeView(ViewState.IMPORT_STOCK);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center pl-12 pr-4 py-2 rounded-lg text-sm transition-colors ${
                                            currentView === ViewState.IMPORT_STOCK
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowDownToLine className="mr-3 h-4 w-4" />
                                        <span>Nhập kho</span>
                                    </button>
                                )}

                                {/* Export Stock */}
                                {isExportVisible && (
                                    <button
                                        onClick={() => {
                                            onChangeView(ViewState.EXPORT_STOCK);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center pl-12 pr-4 py-2 rounded-lg text-sm transition-colors ${
                                            currentView === ViewState.EXPORT_STOCK
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowUpFromLine className="mr-3 h-4 w-4" />
                                        <span>Xuất kho</span>
                                    </button>
                                )}

                                {/* Categories Sub-item (Only if visible in config) */}
                                {isCategoryVisible && (
                                    <button
                                        onClick={() => {
                                            onChangeView(ViewState.CATEGORIES);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center pl-12 pr-4 py-2 rounded-lg text-sm transition-colors ${
                                            currentView === ViewState.CATEGORIES
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <FolderOpen className="mr-3 h-4 w-4" />
                                        <span>Danh mục</span>
                                    </button>
                                )}

                                {/* Units Sub-item (Only if visible in config) */}
                                {isUnitVisible && (
                                    <button
                                        onClick={() => {
                                            onChangeView(ViewState.UNITS);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center pl-12 pr-4 py-2 rounded-lg text-sm transition-colors ${
                                            currentView === ViewState.UNITS
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Scale className="mr-3 h-4 w-4" />
                                        <span>Đơn vị tính</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            }

            // STANDARD RENDER
            const Icon = meta.icon;
            const isActive = currentView === configItem.id;
            return (
              <button
                key={configItem.id}
                onClick={() => {
                  onChangeView(configItem.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 space-y-2">
            {/* Clock Widget */}
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50 mb-2 shadow-inner">
                <p className="text-2xl font-bold text-blue-400 font-mono tracking-wider">
                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-400 mt-1 capitalize flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
            </div>

            {/* Admin Tool: Menu Management */}
            {isAdmin && (
                <button 
                    onClick={() => {
                        onChangeView(ViewState.MENU_MANAGEMENT);
                        setIsOpen(false);
                    }}
                    className={`
                        w-full flex items-center px-4 py-2 rounded-lg transition-colors
                        ${currentView === ViewState.MENU_MANAGEMENT ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}
                    `}
                >
                    <Layout className="mr-3 h-5 w-5" />
                    <span className="font-medium">Quản lý Menu</span>
                </button>
            )}

            <button 
                onClick={logout}
                className="w-full flex items-center px-4 py-2 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
            >
                <LogOut className="mr-3 h-5 w-5" />
                <span className="font-medium">Đăng xuất</span>
            </button>
            <p className="text-xs text-slate-600 text-center mt-2">v1.7.0 - Unit Mgmt</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;