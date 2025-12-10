import React, { useState, useEffect, useMemo } from 'react';
import { Customer, DebtTransaction, User } from '../types';
import { payDebt, getDebtTransactions } from '../services/db';
import { DollarSign, Search, CheckCircle, History, List, Calendar, User as UserIcon, Eye, X, FileText } from 'lucide-react';

interface DebtProps {
  customers: Customer[];
  currentUser: User | null;
}

const Debt: React.FC<DebtProps> = ({ customers, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  // History State
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  
  // Detail Modal State
  const [viewingTransaction, setViewingTransaction] = useState<DebtTransaction | null>(null);

  const loadTransactions = () => {
    setTransactions(getDebtTransactions());
  };

  useEffect(() => {
    loadTransactions();
    window.addEventListener('db-change', loadTransactions);
    return () => window.removeEventListener('db-change', loadTransactions);
  }, []);

  const debtCustomers = customers
    .filter(c => c.debt > 0)
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handlePayment = () => {
    if (!selectedCustomer) return;
    const amount = parseInt(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert('Số tiền không hợp lệ');
    if (amount > selectedCustomer.debt) return alert('Số tiền trả vượt quá nợ');

    // Pass current user name to transaction
    const staffName = currentUser?.name || 'Không xác định';
    payDebt(selectedCustomer.id, amount, staffName);
    
    // Alert removed for better UX, could use a toast notification instead
    setSelectedCustomer(null);
    setPaymentAmount('');
  };

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search
    if (historySearch) {
      const lower = historySearch.toLowerCase();
      result = result.filter(t => 
        t.customerName.toLowerCase().includes(lower) ||
        (t.staffName && t.staffName.toLowerCase().includes(lower))
      );
    }

    // Date
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date) <= end);
    }

    // Sort newest first
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, historySearch, startDate, endDate]);

  const renderTabs = () => (
    <div className="flex bg-slate-200 p-1 rounded-xl mb-6 w-fit">
      <button 
        onClick={() => setActiveTab('list')}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
      >
        <List className="h-4 w-4" /> Danh sách nợ
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
      >
        <History className="h-4 w-4" /> Lịch sử thu nợ
      </button>
    </div>
  );

  const renderList = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Tìm khách hàng nợ..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3 text-right">Tổng Nợ</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debtCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.phone}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {customer.debt.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => setSelectedCustomer(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <DollarSign className="h-4 w-4" /> Thu nợ
                    </button>
                  </td>
                </tr>
              ))}
              {debtCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                        <p>Không có khách hàng nào đang nợ.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" /> Nhật ký thu nợ
            </h3>
            
            <div className="flex flex-col md:flex-row w-full xl:w-auto gap-3">
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 md:w-36 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                    />
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 md:w-36 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                    />
                </div>
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input 
                        type="text" 
                        placeholder="Tìm khách hàng, nhân viên..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                    />
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">Ngày thu</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Nhân viên</th>
                    <th className="px-4 py-3">Ghi chú</th>
                    <th className="px-4 py-3 text-right">Số tiền thu</th>
                    <th className="px-4 py-3 text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(t => (
                    <tr 
                        key={t.id} 
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setViewingTransaction(t)}
                    >
                      <td className="px-4 py-3 text-slate-600">
                          {new Date(t.date).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.customerName}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.staffName ? (
                            <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3 text-slate-400" /> {t.staffName}
                            </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{t.note || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        +{t.amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 text-center">
                          <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                              <Eye className="h-4 w-4" />
                          </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Chưa có lịch sử giao dịch nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Quản Lý Công Nợ</h2>
      
      {renderTabs()}

      {activeTab === 'list' ? renderList() : renderHistory()}

      {/* Payment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Thu nợ khách hàng</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Khách hàng</p>
                <p className="font-bold text-lg text-slate-800">{selectedCustomer.name}</p>
                <p className="text-sm text-slate-500 mt-2">Nợ hiện tại</p>
                <p className="font-bold text-xl text-red-600">{selectedCustomer.debt.toLocaleString('vi-VN')} ₫</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền thanh toán</label>
                <input 
                  type="number"
                  autoFocus
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="text-sm text-slate-500 flex items-center gap-1 bg-blue-50 p-2 rounded">
                 <UserIcon className="h-3 w-3" /> Người thu: <span className="font-bold text-blue-700">{currentUser?.name}</span>
              </div>

              <button 
                onClick={handlePayment}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {viewingTransaction && (
          <DebtTransactionDetailModal 
            transaction={viewingTransaction}
            onClose={() => setViewingTransaction(null)}
          />
      )}
    </div>
  );
};

const DebtTransactionDetailModal: React.FC<{
    transaction: DebtTransaction;
    onClose: () => void;
}> = ({ transaction, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Chi tiết phiếu thu
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 uppercase tracking-wide">Số tiền thu</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">
                            +{transaction.amount.toLocaleString('vi-VN')} ₫
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded-lg">
                             <span className="block text-slate-500 text-xs mb-1">Thời gian</span>
                             <span className="font-medium text-slate-800 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(transaction.date).toLocaleString('vi-VN')}
                             </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                             <span className="block text-slate-500 text-xs mb-1">Mã phiếu (System ID)</span>
                             <span className="font-mono text-slate-600 text-xs truncate block" title={transaction.id}>
                                #{transaction.id}
                             </span>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Khách hàng:</span>
                            <span className="font-bold text-slate-800 text-lg">{transaction.customerName}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-slate-500">Người thực hiện:</span>
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                                <UserIcon className="h-4 w-4 text-slate-400" />
                                {transaction.staffName || '---'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-700 mb-1 flex items-center gap-1">
                            Ghi chú
                        </h4>
                        <p className="text-slate-700 text-sm italic">
                            {transaction.note || 'Không có ghi chú.'}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Debt;