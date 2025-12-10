import React, { useState, useEffect } from 'react';
import { ViewState, Customer, Product, Order, User, MenuConfigItem } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Sales from './components/Sales';
import Debt from './components/Debt';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import MenuManagement from './components/MenuManagement';
import CategoryManagement from './components/CategoryManagement';
import StockMovement from './components/StockMovement'; // New Component
import DataSync from './components/DataSync'; // New Component
import { getCustomers, getProducts, getOrders, getCurrentUser, getMenuConfig, getSyncConfig, exportDatabase, updateLastBackupTime } from './services/db';
import { Menu, Lock, ShieldAlert, DownloadCloud } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.SALES); // Default to Sales as it's common for both
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // App State - In a real large app this would be in Context or Redux
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuConfig, setMenuConfig] = useState<MenuConfigItem[]>([]);

  const loadData = () => {
    setProducts(getProducts());
    setCustomers(getCustomers());
    setOrders(getOrders());
    setMenuConfig(getMenuConfig());
  };

  // Helper function to trigger download
  const performAutoBackup = () => {
    const jsonString = exportDatabase();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    a.download = `auto_backup_qlbh_${date}_${time}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateLastBackupTime();
    console.log("Auto backup completed");
  };

  useEffect(() => {
    // Check auth
    const user = getCurrentUser();
    setCurrentUser(user);
    
    if (user) {
        loadData();
        // If admin, check menu config for default view, fallback to dashboard
        if (user.role === 'admin') {
            const config = getMenuConfig();
            // Find first visible item
            const firstVisible = config.find(m => m.isVisible);
            setCurrentView(firstVisible ? firstVisible.id : ViewState.DASHBOARD);
        } else {
            setCurrentView(ViewState.SALES);
        }
    }
    
    setIsLoading(false);

    // Listen to custom event for DB changes (simulate real-time sync)
    const handleDbChange = () => loadData();
    const handleMenuConfigChange = () => setMenuConfig(getMenuConfig());

    window.addEventListener('db-change', handleDbChange);
    window.addEventListener('menu-config-change', handleMenuConfigChange);

    // --- AUTO BACKUP LOGIC ---
    // Check every 1 minute
    const backupInterval = setInterval(() => {
      const config = getSyncConfig();
      if (config.autoBackup) {
        const last = new Date(config.lastBackup).getTime();
        const now = new Date().getTime();
        const intervalMs = config.intervalMinutes * 60 * 1000;
        
        if (now - last > intervalMs) {
          performAutoBackup();
        }
      }
    }, 60000); // 1 minute

    return () => {
      window.removeEventListener('db-change', handleDbChange);
      window.removeEventListener('menu-config-change', handleMenuConfigChange);
      clearInterval(backupInterval);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    loadData();
    if (user.role === 'admin') {
        const config = getMenuConfig();
        const firstVisible = config.find(m => m.isVisible);
        setCurrentView(firstVisible ? firstVisible.id : ViewState.DASHBOARD);
    } else {
        setCurrentView(ViewState.SALES);
    }
  };

  // Protected Route Logic
  const renderContent = () => {
    if (!currentUser) return null;

    const isAdmin = currentUser.role === 'admin';

    // 1. Kiểm tra cấu hình Menu (Menu Management Check)
    // Nếu view hiện tại bị ẩn trong cấu hình VÀ user không phải admin -> Chặn truy cập
    const currentViewConfig = menuConfig.find(m => m.id === currentView);
    if (!isAdmin && currentViewConfig && !currentViewConfig.isVisible) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-500 animate-in fade-in duration-300">
            <div className="bg-slate-100 p-6 rounded-full mb-6">
                <Lock className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Quyền truy cập bị hạn chế</h3>
            <p className="max-w-md text-center text-slate-500">
                Tính năng <span className="font-semibold text-slate-700">{currentViewConfig.customLabel || currentViewConfig.id}</span> hiện đang bị ẩn bởi quản trị viên.
            </p>
        </div>
      );
    }

    // 2. Render View dựa trên Role cứng (Hardcoded Role Check)
    switch (currentView) {
      case ViewState.DASHBOARD:
        return isAdmin ? <Dashboard products={products} customers={customers} orders={orders} /> : <div className="p-4 text-red-500">Bạn không có quyền truy cập.</div>;
      case ViewState.INVENTORY:
        return <Inventory products={products} />;
      case ViewState.IMPORT_STOCK:
        return <StockMovement products={products} currentUser={currentUser} mode="import" />;
      case ViewState.EXPORT_STOCK:
        return <StockMovement products={products} currentUser={currentUser} mode="export" />;
      case ViewState.CATEGORIES:
        return <CategoryManagement />;
      case ViewState.CUSTOMERS:
        return <Customers customers={customers} />;
      case ViewState.SALES:
        return <Sales products={products} customers={customers} orders={orders} currentUser={currentUser} />;
      case ViewState.DEBT:
        return isAdmin ? <Debt customers={customers} currentUser={currentUser} /> : <div className="p-4 text-red-500">Bạn không có quyền truy cập.</div>;
      case ViewState.DATA_SYNC:
        return isAdmin ? <DataSync /> : <div className="p-4 text-red-500">Bạn không có quyền truy cập.</div>;
      case ViewState.USERS:
        return isAdmin ? <UserManagement /> : <div className="p-4 text-red-500">Bạn không có quyền truy cập.</div>;
      case ViewState.MENU_MANAGEMENT:
        return isAdmin ? <MenuManagement /> : <div className="p-4 text-red-500">Bạn không có quyền truy cập.</div>;
      default:
        return <Sales products={products} customers={customers} orders={orders} currentUser={currentUser} />;
    }
  };

  if (isLoading) return null; // Or a spinner

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentUser={currentUser}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h1 className="font-bold text-slate-800">Quản Lý Bán Hàng</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Menu className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;