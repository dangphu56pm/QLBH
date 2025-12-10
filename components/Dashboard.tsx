import React, { useMemo } from 'react';
import { Customer, Order, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertCircle, DollarSign, Users } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, customers, orders }) => {
  const stats = useMemo(() => {
    // Calculate total revenue using finalAmount (if exists) or totalAmount
    const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);
    const totalDebt = customers.reduce((sum, cus) => sum + cus.debt, 0);
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const totalOrders = orders.length;

    return { totalRevenue, totalDebt, lowStockCount, totalOrders };
  }, [orders, customers, products]);

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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sắp hết hàng</p>
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

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Biểu đồ doanh thu</h3>
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

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 overflow-auto">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Đơn hàng gần đây</h3>
          <div className="space-y-4">
            {orders.slice().reverse().slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{order.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.date).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">
                    {(order.finalAmount ?? order.totalAmount).toLocaleString('vi-VN')} ₫
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${order.debtAmount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {order.debtAmount > 0 ? 'Nợ' : 'Đã thanh toán'}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-slate-500 text-center">Chưa có đơn hàng nào</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;