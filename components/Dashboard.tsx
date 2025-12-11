
import React, { useMemo, useState, useEffect } from 'react';
import { Customer, Order, Product, ViewState } from '../types';
import { getSyncConfig } from '../services/db';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, AlertCircle, DollarSign, Users, Package, ArrowRight, AlertTriangle, Wallet, PieChart as PieChartIcon, BarChart3, ShoppingBag } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onNavigate: (view: ViewState) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard: React.FC<DashboardProps> = ({ products, customers, orders, onNavigate }) => {
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  useEffect(() => {
    setExpiryAlertDays(getSyncConfig().expiryAlertDays);
    
    const handleConfigChange = () => setExpiryAlertDays(getSyncConfig().expiryAlertDays);
    window.addEventListener('config-change', handleConfigChange);
    return () => window.removeEventListener('config-change', handleConfigChange);
  }, []);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);
    const totalDebt = customers.reduce((sum, cus) => sum + cus.debt, 0);
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const totalOrders = orders.length;

    // Estimate Profit (Current Stock Cost approximation)
    let totalProfit = 0;
    orders.forEach(order => {
        const revenue = order.finalAmount ?? order.totalAmount;
        const cost = order.items.reduce((c, item) => {
            const product = products.find(p => p.id === item.productId);
            return c + ((product?.cost || 0) * item.quantity);
        }, 0);
        totalProfit += (revenue - cost);
    });

    return { totalRevenue, totalDebt, lowStockCount, totalOrders, totalProfit };
  }, [orders, customers, products]);

  // --- LIST DATA ---
  const lowStockItems = useMemo(() => products.filter(p => p.stock < 5), [products]);

  const expiringItems = useMemo(() => {
      if (!expiryAlertDays) return [];
      const today = new Date();
      return products.filter(p => {
          if (!p.expiryDate) return false;
          const expiry = new Date(p.expiryDate);
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= expiryAlertDays;
      }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }, [products, expiryAlertDays]);

  const highDebtCustomers = useMemo(() => {
    return customers
      .filter(c => c.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 5);
  }, [customers]);

  // --- CHART 1: REVENUE & PROFIT TREND (Area Chart) ---
  const trendData = useMemo(() => {
    const data: Record<string, { name: string, revenue: number, profit: number }> = {};
    
    // Sort orders by date first to ensure chart is chronological
    const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedOrders.forEach(order => {
      const dateKey = new Date(order.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const revenue = order.finalAmount ?? order.totalAmount;
      
      const cost = order.items.reduce((c, item) => {
          const product = products.find(p => p.id === item.productId);
          return c + ((product?.cost || 0) * item.quantity);
      }, 0);

      if (!data[dateKey]) {
          data[dateKey] = { name: dateKey, revenue: 0, profit: 0 };
      }
      data[dateKey].revenue += revenue;
      data[dateKey].profit += (revenue - cost);
    });

    // Take last 7-10 active days for cleaner dashboard view
    return Object.values(data).slice(-10);
  }, [orders, products]);

  // --- CHART 2: REVENUE BY CATEGORY (Donut Chart) ---
  const categoryData = useMemo(() => {
      const catStats: Record<string, number> = {};
      orders.forEach(order => {
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              const catName = product?.category || 'Khác';
              catStats[catName] = (catStats[catName] || 0) + item.total;
          });
      });

      return Object.entries(catStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort highest first
  }, [orders, products]);

  // --- CHART 3: TOP SELLING PRODUCTS (Bar Chart) ---
  const topProductsData = useMemo(() => {
      const prodStats: Record<string, number> = {};
      orders.forEach(order => {
          order.items.forEach(item => {
              // Use product name as key
              prodStats[item.productName] = (prodStats[item.productName] || 0) + item.quantity;
          });
      });

      return Object.entries(prodStats)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5
  }, [orders]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Tổng Quan Kinh Doanh</h2>

      {/* KPI Cards - Highlighted Version */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* REVENUE */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg shadow-blue-200 relative overflow-hidden text-white transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-blue-100 font-medium text-sm uppercase tracking-wide">Doanh thu</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">
                {stats.totalRevenue.toLocaleString('vi-VN')} ₫
              </p>
              <div className="flex items-center gap-1 mt-2 text-blue-100 bg-blue-500/30 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                 <TrendingUp className="h-4 w-4 text-green-300" /> 
                 <span className="text-sm font-medium">Lãi: {stats.totalProfit.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          {/* Decorative Background Icon */}
          <div className="absolute -right-4 -bottom-4 opacity-10">
              <DollarSign className="h-32 w-32 transform rotate-12" />
          </div>
        </div>

        {/* DEBT */}
        <div 
          onClick={() => onNavigate(ViewState.DEBT)}
          className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-lg shadow-orange-200 relative overflow-hidden text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-orange-100 font-medium text-sm uppercase tracking-wide group-hover:text-white transition-colors">Tổng công nợ</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">
                {stats.totalDebt.toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-sm text-orange-100 mt-2 flex items-center gap-1">
                  Xem chi tiết <ArrowRight className="h-4 w-4" />
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Wallet className="h-32 w-32 transform -rotate-12" />
          </div>
        </div>

        {/* ORDERS */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-lg shadow-purple-200 relative overflow-hidden text-white transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-purple-100 font-medium text-sm uppercase tracking-wide">Đơn hàng</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">
                {stats.totalOrders}
              </p>
              <p className="text-sm text-purple-100 mt-2">Tổng số đơn đã bán</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
              <ShoppingBag className="h-32 w-32 transform rotate-12" />
          </div>
        </div>

        {/* INVENTORY WARNING */}
        <div 
          onClick={() => onNavigate(ViewState.INVENTORY)}
          className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-2xl shadow-lg shadow-pink-200 relative overflow-hidden text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-pink-100 font-medium text-sm uppercase tracking-wide group-hover:text-white transition-colors">Sắp hết hàng</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">
                {stats.lowStockCount} <span className="text-lg font-normal text-pink-200">SP</span>
              </p>
              <p className="text-sm text-pink-100 mt-2 flex items-center gap-1">
                  Cần nhập thêm <ArrowRight className="h-4 w-4" />
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md animate-pulse">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Package className="h-32 w-32 transform -rotate-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Revenue Trend & Top Products */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Revenue & Profit Trend */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[350px]">
                <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> Xu hướng doanh thu & Lợi nhuận
                </h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} tick={{fontSize: 12, fill: '#64748b'}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: number) => [value.toLocaleString('vi-VN') + ' ₫', '']}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                            <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                            <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Top Selling Products */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" /> Top 5 Sản phẩm bán chạy
                </h3>
                <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topProductsData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#475569'}} />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="quantity" name="Số lượng" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                                {topProductsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Right Column: Category Distribution & Alerts */}
        <div className="space-y-6">
            
            {/* 3. Category Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[350px] flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-slate-800 flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-orange-500" /> Doanh thu theo danh mục
                </h3>
                <div className="flex-1 min-h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + ' ₫'} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-8">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-medium">Tổng số</p>
                            <p className="text-xl font-bold text-slate-700">{categoryData.length}</p>
                            <p className="text-[10px] text-slate-400">Danh mục</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock List (Existing but refined) */}
            {lowStockItems.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 animate-in fade-in duration-300">
                    <h3 className="font-bold text-red-600 flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5" /> Cần nhập hàng ngay
                    </h3>
                    <div className="space-y-3 mb-4">
                        {lowStockItems.slice(0, 3).map(p => (
                            <div 
                                key={p.id} 
                                className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-slate-800 truncate max-w-[150px]">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.code}</p>
                                </div>
                                <span className="font-bold text-red-600 text-sm bg-red-50 px-2 py-0.5 rounded-full">
                                    SL: {p.stock}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => onNavigate(ViewState.INVENTORY)}
                        className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                        Kiểm tra kho <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* High Debt Customers (Existing) */}
            {highDebtCustomers.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Wallet className="h-5 w-5 text-orange-600" /> Khách nợ cao
                    </h3>
                    <div className="space-y-3 mb-4">
                        {highDebtCustomers.map(c => (
                            <div key={c.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                <div className="overflow-hidden">
                                    <p className="font-medium text-slate-800 text-sm truncate max-w-[150px]">{c.name}</p>
                                    <p className="text-xs text-slate-500">{c.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600 text-sm">
                                        {c.debt.toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => onNavigate(ViewState.DEBT)}
                        className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                        Quản lý công nợ <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
