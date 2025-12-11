import React, { useState, useMemo } from 'react';
import { Order, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Filter, BarChart3, PieChart } from 'lucide-react';

interface ReportsProps {
  orders: Order[];
  products: Product[];
}

type ReportType = 'revenue' | 'profit';
type TimeRange = 'week' | 'month' | 'year' | 'custom';

const Reports: React.FC<ReportsProps> = ({ orders, products }) => {
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // --- Helper to calculate cost for an order ---
  // Note: Since OrderItem doesn't store cost at time of sale, we look up current cost from Product list.
  // This is a limitation if cost changes over time, but sufficient for basic reporting.
  const calculateOrderCost = (order: Order): number => {
    return order.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.cost : 0;
      return sum + (cost * item.quantity);
    }, 0);
  };

  // --- Filter Data ---
  const filteredOrders = useMemo(() => {
    let start = new Date(startDate);
    let end = new Date(endDate);
    
    // Auto-adjust dates based on presets if not custom
    const today = new Date();
    if (timeRange === 'week') {
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = today;
    } else if (timeRange === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
    } else if (timeRange === 'year') {
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return orders.filter(o => {
      const d = new Date(o.date);
      return d >= start && d <= end && o.status === 'completed';
    });
  }, [orders, timeRange, startDate, endDate]);

  // --- Aggregate Data ---
  const aggregatedData = useMemo(() => {
    const data: Record<string, { date: string, revenue: number, cost: number, profit: number, orders: number }> = {};
    let totalRev = 0;
    let totalCost = 0;
    let totalProfit = 0;

    filteredOrders.forEach(order => {
      const dateKey = new Date(order.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      const revenue = order.finalAmount ?? order.totalAmount;
      const cost = calculateOrderCost(order);
      const profit = revenue - cost;

      if (!data[dateKey]) {
        data[dateKey] = { date: dateKey, revenue: 0, cost: 0, profit: 0, orders: 0 };
      }

      data[dateKey].revenue += revenue;
      data[dateKey].cost += cost;
      data[dateKey].profit += profit;
      data[dateKey].orders += 1;

      totalRev += revenue;
      totalCost += cost;
      totalProfit += profit;
    });

    // Sort by date key is tricky with DD/MM string, usually we sort by underlying timestamp. 
    // For simplicity with 'vi-VN' DD/MM format, string sort might fail across years or months improperly if range is large.
    // Better approach: sort based on the filteredOrders order (assuming they are somewhat ordered or we sort the keys based on a parsed date).
    const sortedKeys = Object.keys(data).sort((a, b) => {
        // Simple parser for DD/MM
        const [d1, m1] = a.split('/').map(Number);
        const [d2, m2] = b.split('/').map(Number);
        if (m1 !== m2) return m1 - m2;
        return d1 - d2;
    });

    return {
      chartData: sortedKeys.map(k => data[k]),
      totals: { revenue: totalRev, cost: totalCost, profit: totalProfit, count: filteredOrders.length }
    };
  }, [filteredOrders, products]);

  const profitMargin = aggregatedData.totals.revenue > 0 
    ? (aggregatedData.totals.profit / aggregatedData.totals.revenue) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" /> Báo Cáo Kinh Doanh
        </h2>
        
        {/* Date Filter Controls */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            {(['week', 'month', 'year', 'custom'] as TimeRange[]).map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        timeRange === range 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {range === 'week' && '7 Ngày'}
                    {range === 'month' && 'Tháng này'}
                    {range === 'year' && 'Năm nay'}
                    {range === 'custom' && 'Tùy chọn'}
                </button>
            ))}
        </div>
      </div>

      {/* Custom Date Picker */}
      {timeRange === 'custom' && (
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 w-fit animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-slate-500">Từ:</span>
              <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm font-bold text-slate-500">Đến:</span>
              <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
              />
          </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Doanh thu</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{aggregatedData.totals.revenue.toLocaleString('vi-VN')} ₫</p>
                  <p className="text-xs text-slate-400 mt-1">{aggregatedData.totals.count} đơn hàng</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Lợi nhuận gộp</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{aggregatedData.totals.profit.toLocaleString('vi-VN')} ₫</p>
                  <p className="text-xs text-slate-400 mt-1">Sau khi trừ giá vốn</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Tỷ suất lợi nhuận</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{profitMargin.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-1">Trên doanh thu</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                  <PieChart className="h-6 w-6 text-purple-600" />
              </div>
          </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 text-lg">Biểu đồ tăng trưởng</h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                      onClick={() => setReportType('revenue')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          reportType === 'revenue' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                      DOANH THU
                  </button>
                  <button
                      onClick={() => setReportType('profit')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          reportType === 'profit' ? 'bg-white shadow text-green-700' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                      LỢI NHUẬN
                  </button>
              </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                {reportType === 'revenue' ? (
                     <BarChart data={aggregatedData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip formatter={(val: number) => val.toLocaleString('vi-VN') + ' ₫'} />
                        <Legend />
                        <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                     </BarChart>
                ) : (
                    <BarChart data={aggregatedData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip formatter={(val: number) => val.toLocaleString('vi-VN') + ' ₫'} />
                        <Legend />
                        <Bar dataKey="profit" name="Lợi nhuận" fill="#10b981" radius={[4, 4, 0, 0]} />
                     </BarChart>
                )}
            </ResponsiveContainer>
          </div>
      </div>

      {/* Detailed Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Chi tiết theo ngày</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Ngày</th>
                          <th className="px-6 py-3 text-center">Số đơn hàng</th>
                          <th className="px-6 py-3 text-right">Doanh thu</th>
                          <th className="px-6 py-3 text-right text-slate-500">Giá vốn (Ước tính)</th>
                          <th className="px-6 py-3 text-right">Lợi nhuận</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {[...aggregatedData.chartData].reverse().map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-medium text-slate-800">{row.date}</td>
                              <td className="px-6 py-3 text-center text-slate-600">{row.orders}</td>
                              <td className="px-6 py-3 text-right font-bold text-blue-600">{row.revenue.toLocaleString('vi-VN')}</td>
                              <td className="px-6 py-3 text-right text-slate-500">{row.cost.toLocaleString('vi-VN')}</td>
                              <td className="px-6 py-3 text-right font-bold text-green-600">{row.profit.toLocaleString('vi-VN')}</td>
                          </tr>
                      ))}
                      {aggregatedData.chartData.length === 0 && (
                          <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-400">Không có dữ liệu trong khoảng thời gian này</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default Reports;