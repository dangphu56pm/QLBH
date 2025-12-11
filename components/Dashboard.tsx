import React, { useMemo, useState, useEffect } from 'react';
import { Customer, Order, Product, ViewState } from '../types';
import { getSyncConfig } from '../services/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertCircle, DollarSign, Users, Package, ArrowRight, AlertTriangle, Calendar, Wallet } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, customers, orders, onNavigate }) => {
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  useEffect(() => {
    setExpiryAlertDays(getSyncConfig().expiryAlertDays);
    
    // Listen for config changes to update alert threshold instantly
    const handleConfigChange = () => setExpiryAlertDays(getSyncConfig().expiryAlertDays);
    window.addEventListener('config-change', handleConfigChange);
    return () => window.removeEventListener('config-change', handleConfigChange);
  }, []);

  const stats = useMemo(() => {
    // Calculate total revenue using finalAmount (if exists) or totalAmount
    const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);
    const totalDebt = customers.reduce((sum, cus) => sum + cus.debt, 0);
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const totalOrders = orders.length;

    return { totalRevenue, totalDebt, lowStockCount, totalOrders };
  }, [orders, customers, products]);

  const lowStockItems = useMemo(() => {
      return products.filter(p => p.stock < 5);
  }, [products]);

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

  const chartData = useMemo(() => {
    // Group orders by date (last 7 days simplified)
    const data: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const revenue = order.finalAmount ?? order.totalAmount;
      data[date] = (data[date] || 0) + revenue;
    });
    
    // Sort keys and map
    return Object.keys(data).sort().map(key => ({
      name: key,
      revenue: data[key]
    }));
  }, [orders]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Tổng Quan Kinh Doanh</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Doanh thu</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {stats.totalRevenue.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => onNavigate(ViewState.DEBT)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng công nợ</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {stats.totalDebt.toLocaleString('vi-VN')} ₫
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full text-orange-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Đơn hàng</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {stats.totalOrders}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => onNavigate(ViewState.INVENTORY)}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 group-hover:text-red-600 transition-colors">Sắp hết hàng</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.lowStockCount}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tables & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Biểu đồ doanh thu</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + ' ₫'} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts, Expiry Alerts, Debt & Recent Orders */}
        <div className="space-y-6">
            
            {/* Low Stock List */}
            {lowStockItems.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 animate-in fade-in duration-300">
                    <h3 className="font-bold text-red-600 flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5" /> Cần nhập hàng ngay
                    </h3>
                    <div className="space-y-3 mb-4">
                        {lowStockItems.slice(0, 3).map(p => (
                            <div 
                                key={p.id} 
                                className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-slate-800 truncate max-w-[120px]" title={p.name}>{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.code}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-red-600 text-sm bg-red-50 px-2 py-0.5 rounded-full">
                                    SL: {p.stock}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expiry Alerts */}
            {expiringItems.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 animate-in fade-in duration-300">
                    <h3 className="font-bold text-orange-600 flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5" /> Sắp hết hạn
                    </h3>
                    <div className="space-y-3 mb-4">
                        {expiringItems.slice(0, 3).map(p => {
                            const today = new Date();
                            const expiry = new Date(p.expiryDate!);
                            const diffTime = expiry.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            return (
                            <div 
                                key={p.id} 
                                className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-slate-800 truncate max-w-[120px]" title={p.name}>{p.name}</p>
                                        <p className="text-xs text-slate-500">Lô: {p.batchNumber || '-'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${diffDays < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {diffDays < 0 ? 'Đã hết' : `${diffDays} ngày`}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(p.expiryDate!).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                        )})}
                    </div>
                    <button 
                        onClick={() => onNavigate(ViewState.INVENTORY)}
                        className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                        Kiểm tra kho <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* High Debt Customers */}
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
                                        {c.debt.toLocaleString('vi-VN')} ₫
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

            {/* Recent Orders */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex-1">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Đơn hàng gần đây</h3>
                <div className="space-y-4">
                    {orders.slice().reverse().slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                        <p className="font-medium text-slate-800 text-sm truncate max-w-[150px]">{order.customerName}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(order.date).toLocaleDateString('vi-VN')}
                        </p>
                        </div>
                        <div className="text-right">
                        <p className="font-bold text-slate-800 text-sm">
                            {(order.finalAmount ?? order.totalAmount).toLocaleString('vi-VN')} ₫
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${order.debtAmount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {order.debtAmount > 0 ? 'Nợ' : 'Xong'}
                        </span>
                        </div>
                    </div>
                    ))}
                    {orders.length === 0 && <p className="text-slate-500 text-center py-4">Chưa có đơn hàng nào</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;