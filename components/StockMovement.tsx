import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, User, InventoryTransaction, InventoryTransactionItem, TransactionType } from '../types';
import { createInventoryTransaction, getInventoryTransactions } from '../services/db';
import { Search, Plus, Minus, Trash2, ArrowDownToLine, ArrowUpFromLine, Save, History, Calendar, User as UserIcon, ScanLine, CheckCircle, Package, Hash, DollarSign, Eye, Printer, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StockMovementProps {
  products: Product[];
  currentUser: User | null;
  mode: TransactionType; // 'import' or 'export'
}

declare const Html5QrcodeScanner: any;

const StockMovement: React.FC<StockMovementProps> = ({ products, currentUser, mode }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Create State
  const [cart, setCart] = useState<InventoryTransactionItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [note, setNote] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // History State
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  
  // Pagination State (for History)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Detail Modal State
  const [viewingTransaction, setViewingTransaction] = useState<InventoryTransaction | null>(null);

  const isImport = mode === 'import';

  // Generate Code on Load or Mode Change
  useEffect(() => {
    const prefix = isImport ? 'PNK' : 'PXK';
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    setTransactionCode(`${prefix}-${timestamp}${random}`);
  }, [mode, activeTab]);

  useEffect(() => {
    // Reset state when mode changes
    setCart([]);
    setNote('');
    setActiveTab('create');
    setTransactions(getInventoryTransactions());
    setViewingTransaction(null);
    setCurrentPage(1); // Reset page on mode change
  }, [mode]);

  const loadHistory = () => {
    setTransactions(getInventoryTransactions());
  };

  useEffect(() => {
      loadHistory();
      window.addEventListener('db-change', loadHistory);
      return () => window.removeEventListener('db-change', loadHistory);
  }, []);


  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
    );
  }, [products, productSearch]);

  const filteredTransactions = useMemo(() => {
      return transactions
        .filter(t => t.type === mode)
        .filter(t => 
            t.code?.toLowerCase().includes(historySearch.toLowerCase()) ||
            t.staffName.toLowerCase().includes(historySearch.toLowerCase()) ||
            (t.note && t.note.toLowerCase().includes(historySearch.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, historySearch, mode]);

  // Reset pagination when search changes
  useEffect(() => {
      setCurrentPage(1);
  }, [historySearch]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);


  // Calculate Total Amount
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
        const itemCost = item.cost || 0;
        return sum + (itemCost * item.quantity);
    }, 0);
  }, [cart]);

  // --- ACTIONS ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exist = prev.find(item => item.productId === product.id);
      if (exist) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        // Luôn lưu giá vốn để tính giá trị kho (dù là nhập hay xuất)
        cost: product.cost,
        batchNumber: product.batchNumber, // Kế thừa batch hiện tại nếu có
        expiryDate: product.expiryDate // Kế thừa expiry hiện tại nếu có
      }];
    });
    setProductSearch('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        
        // Validation for Export
        if (!isImport) {
            const product = products.find(p => p.id === productId);
            if (product && newQty > product.stock) {
                alert(`Tồn kho chỉ còn ${product.stock}!`);
                return item;
            }
        }
        
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateCost = (productId: string, newCost: number) => {
      if (!isImport) return; // Chỉ cho phép sửa giá khi nhập kho
      setCart(prev => prev.map(item => 
          item.productId === productId ? { ...item, cost: newCost } : item
      ));
  };
  
  const updateBatchInfo = (productId: string, field: 'batchNumber' | 'expiryDate', value: string) => {
      if (!isImport) return; // Chỉ cho phép sửa khi nhập kho
      setCart(prev => prev.map(item => 
          item.productId === productId ? { ...item, [field]: value } : item
      ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleScanProduct = (code: string) => {
    const product = products.find(p => p.code === code || p.barcode === code);
    if (product) {
        // Sound effect
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}

        addToCart(product);
        return { success: true, name: product.name };
    }
    return { success: false, name: '' };
  };

  const handleSubmit = () => {
    if (cart.length === 0) return alert('Chưa chọn sản phẩm nào');
    if (!currentUser) return alert('Lỗi phiên đăng nhập');

    const transaction: Omit<InventoryTransaction, 'id'> = {
        code: transactionCode,
        type: mode,
        date: new Date().toISOString(),
        items: cart,
        staffName: currentUser.name,
        note: note,
        totalAmount: totalAmount
    };

    createInventoryTransaction(transaction);
    alert(`${isImport ? 'Nhập' : 'Xuất'} kho thành công!`);
    
    // Reset form
    setCart([]);
    setNote('');
    // Regenerate code
    const prefix = isImport ? 'PNK' : 'PXK';
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    setTransactionCode(`${prefix}-${timestamp}${random}`);
  };

  // --- PRINT LOGIC ---
  const printTransaction = (transaction: InventoryTransaction) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const date = new Date(transaction.date).toLocaleString('vi-VN');
    const isImport = transaction.type === 'import';
    const typeLabel = isImport ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${typeLabel} #${transaction.code}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: bold; margin: 10px 0; }
          .info { margin-bottom: 15px; }
          .info p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 5px 0; }
          td { padding: 5px 0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-section { border-top: 1px dashed #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { text-align: center; margin-top: 30px; font-style: italic; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 18px; font-weight: bold;">CỬA HÀNG TẠP HÓA</div>
          <div>Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM</div>
          <div class="title">${typeLabel}</div>
        </div>

        <div class="info">
          <p>Mã phiếu: <b>${transaction.code || transaction.id}</b></p>
          <p>Ngày: ${date}</p>
          <p>Người thực hiện: ${transaction.staffName}</p>
          <p>Ghi chú: ${transaction.note || '---'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35%">Tên SP</th>
              <th style="width: 25%">Lô / Hạn</th>
              <th class="text-center" style="width: 15%">SL</th>
              <th class="text-right" style="width: 15%">Đơn giá</th>
              <th class="text-right" style="width: 10%">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${transaction.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td style="font-size: 12px">
                    ${item.batchNumber ? `Lô: ${item.batchNumber}` : ''} <br/>
                    ${item.expiryDate ? `Hạn: ${new Date(item.expiryDate).toLocaleDateString('vi-VN')}` : ''}
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${(item.cost || 0).toLocaleString('vi-VN')}</td>
                <td class="text-right">${((item.cost || 0) * item.quantity).toLocaleString('vi-VN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <b>Tổng cộng:</b>
            <b>${(transaction.totalAmount || 0).toLocaleString('vi-VN')} đ</b>
          </div>
        </div>

        <div class="footer">
          <p>Chữ ký người lập phiếu</p>
          <br><br><br>
          <p>${transaction.staffName}</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- RENDER ---

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isImport ? 'text-green-700' : 'text-orange-700'}`}>
            {isImport ? <ArrowDownToLine className="h-8 w-8" /> : <ArrowUpFromLine className="h-8 w-8" />}
            {isImport ? 'Phiếu Nhập Kho' : 'Phiếu Xuất Kho'}
          </h2>
          
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
            >
                <Plus className="h-4 w-4" /> Tạo phiếu
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
            >
                <History className="h-4 w-4" /> Lịch sử
            </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] gap-6">
            {/* Left: Product Selection */}
            <div className="flex-1 flex flex-col gap-6">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <input
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                placeholder="Tìm sản phẩm..."
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                            />
                            {filteredProducts.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <div 
                                            key={p.id} 
                                            className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                                            onClick={() => addToCart(p)}
                                        >
                                            <div>
                                                <p className="font-medium text-slate-800">{p.name}</p>
                                                <p className="text-sm text-slate-500">{p.code} - Tồn: {p.stock}</p>
                                            </div>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Giá vốn: {p.cost.toLocaleString('vi-VN')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => setIsScannerOpen(true)}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-lg flex items-center justify-center transition-colors"
                        >
                            <ScanLine className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600 flex justify-between">
                        <span>Danh sách sản phẩm ({cart.length})</span>
                        <button onClick={() => setCart([])} className="text-red-500 text-sm hover:underline">Xóa tất cả</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.map(item => (
                            <div key={item.productId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-slate-100 rounded-lg gap-3">
                                <div className="flex-1 space-y-2">
                                    <h4 className="font-medium text-slate-800">{item.productName}</h4>
                                    
                                    {/* Cost Input */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-16">Giá vốn:</span>
                                        {isImport ? (
                                            <div className="relative w-32">
                                                <input 
                                                    type="number"
                                                    className="w-full p-1 pl-2 pr-6 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                    value={item.cost || 0}
                                                    onChange={(e) => updateCost(item.productId, parseInt(e.target.value))}
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">đ</span>
                                            </div>
                                        ) : (
                                            <span className="font-medium text-slate-700 text-sm">{(item.cost || 0).toLocaleString('vi-VN')} ₫</span>
                                        )}
                                    </div>

                                    {/* Batch & Expiry Input (Only Import) */}
                                    {isImport && (
                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 w-16">Số Lô:</span>
                                                <input 
                                                    className="w-32 p-1 px-2 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                    value={item.batchNumber || ''}
                                                    placeholder="VD: L001"
                                                    onChange={(e) => updateBatchInfo(item.productId, 'batchNumber', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Hạn SD:</span>
                                                <input 
                                                    type="date"
                                                    className="w-32 p-1 px-2 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                    value={item.expiryDate || ''}
                                                    onChange={(e) => updateBatchInfo(item.productId, 'expiryDate', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 self-start sm:self-center">
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => updateQuantity(item.productId, -1)} 
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-600 transition-colors"
                                        >
                                            <Minus className="h-4 w-4"/>
                                        </button>
                                        <input 
                                            className="w-12 text-center font-bold text-slate-800 text-lg outline-none bg-transparent"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) {
                                                     // Direct input validation for export
                                                    if (!isImport) {
                                                        const p = products.find(x => x.id === item.productId);
                                                        if (p && val > p.stock) return alert(`Quá tồn kho (${p.stock})`);
                                                    }
                                                    updateQuantity(item.productId, val - item.quantity);
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => updateQuantity(item.productId, 1)} 
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                                        >
                                            <Plus className="h-4 w-4"/>
                                        </button>
                                    </div>
                                    <div className="w-24 text-right">
                                        <p className="font-bold text-slate-800">{((item.cost || 0) * item.quantity).toLocaleString('vi-VN')}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                         {cart.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Package className="h-12 w-12 mb-2 opacity-50" />
                                <p>Chưa chọn sản phẩm nào</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4">Thông tin phiếu</h3>
                    
                    <div className="space-y-4">
                        {/* Transaction Code */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mã phiếu</label>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <Hash className="h-4 w-4 text-slate-400" />
                                <span className="text-blue-600 font-bold font-mono">{transactionCode}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <UserIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-800 font-medium">{currentUser?.name}</span>
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                            <textarea 
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                                placeholder={`Lý do ${isImport ? 'nhập' : 'xuất'} kho...`}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            ></textarea>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tổng tiền</label>
                            <div className={`text-2xl font-bold ${isImport ? 'text-green-600' : 'text-orange-600'}`}>
                                {totalAmount.toLocaleString('vi-VN')} ₫
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={cart.length === 0}
                        className={`w-full mt-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                            ${cart.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 
                              isImport ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                            }
                        `}
                    >
                        <Save className="h-5 w-5" />
                        {isImport ? 'Xác nhận Nhập' : 'Xác nhận Xuất'}
                    </button>
                 </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300 flex flex-col">
             <div className="p-4 border-b border-slate-100 flex gap-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input 
                        type="text" 
                        placeholder="Tìm theo mã phiếu, nhân viên..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                    />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                            <th className="px-6 py-4">Mã Phiếu</th>
                            <th className="px-6 py-4">Ngày giờ</th>
                            <th className="px-6 py-4">Nhân viên</th>
                            <th className="px-6 py-4">Sản phẩm</th>
                            <th className="px-6 py-4 text-right">Tổng tiền</th>
                            <th className="px-6 py-4">Ghi chú</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentTransactions.map(t => (
                            <tr 
                                key={t.id} 
                                className="hover:bg-slate-50 cursor-pointer transition-colors"
                                onClick={() => setViewingTransaction(t)}
                            >
                                <td className="px-6 py-4 font-mono text-blue-600 font-bold">
                                    {t.code || <span className="text-slate-300 italic">#{t.id.slice(0,6)}</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        {new Date(t.date).toLocaleString('vi-VN')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800">{t.staffName}</td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        {t.items.slice(0, 2).map((item, idx) => (
                                            <div key={idx} className="text-xs text-slate-600">
                                                - {item.productName} <span className="font-bold">x{item.quantity}</span>
                                            </div>
                                        ))}
                                        {t.items.length > 2 && (
                                            <div className="text-xs text-slate-400 italic">+ {t.items.length - 2} sản phẩm khác</div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    {(t.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{t.note || '-'}</td>
                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => printTransaction(t)}
                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="In phiếu"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    Chưa có lịch sử giao dịch nào
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>

             {/* Pagination Controls */}
             {filteredTransactions.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                        <span>Hiển thị</span>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-slate-300 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                        <span>dòng / trang</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500">
                            {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTransactions.length)} trên {filteredTransactions.length}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-slate-600" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5 text-slate-600" />
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </div>
      )}

      {isScannerOpen && (
        <QRScannerModal 
          onClose={() => setIsScannerOpen(false)} 
          onScanSuccess={handleScanProduct}
        />
      )}
      
      {viewingTransaction && (
          <TransactionDetailModal 
            transaction={viewingTransaction}
            onClose={() => setViewingTransaction(null)}
            onPrint={() => printTransaction(viewingTransaction)}
          />
      )}
    </div>
  );
};

// --- Sub-Components ---

const QRScannerModal: React.FC<{
  onClose: () => void;
  onScanSuccess: (text: string) => void;
}> = ({ onClose, onScanSuccess }) => {
  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText: string) => {
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (errorMessage: string) => {
        // parse error, ignore it.
      }
    );

    return () => {
      try {
        scanner.clear();
      } catch (error) {
        console.error("Failed to clear scanner", error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-600" /> Quét mã sản phẩm
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <div id="reader" className="w-full"></div>
        </div>
      </div>
    </div>
  );
};

const TransactionDetailModal: React.FC<{
    transaction: InventoryTransaction;
    onClose: () => void;
    onPrint: () => void;
}> = ({ transaction, onClose, onPrint }) => {
    const isImport = transaction.type === 'import';
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {isImport ? <ArrowDownToLine className="h-5 w-5 text-green-600"/> : <ArrowUpFromLine className="h-5 w-5 text-orange-600"/>}
                            Chi tiết phiếu {isImport ? 'nhập' : 'xuất'}
                        </h3>
                        <p className="text-sm text-slate-500 font-mono mt-1">#{transaction.code || transaction.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Thông tin chung</h4>
                            <div className="flex items-center gap-2 text-slate-700">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>{new Date(transaction.date).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700">
                                <UserIcon className="h-4 w-4 text-slate-400" />
                                <span>Người lập: <span className="font-medium text-slate-900">{transaction.staffName}</span></span>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ghi chú</h4>
                             <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                 {transaction.note || 'Không có ghi chú'}
                             </p>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden mb-6">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Sản phẩm</th>
                                    <th className="px-4 py-3">Chi tiết Lô</th>
                                    <th className="px-4 py-3 text-center">SL</th>
                                    <th className="px-4 py-3 text-right">Đơn giá</th>
                                    <th className="px-4 py-3 text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transaction.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{item.productName}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {item.batchNumber ? <div>Lô: {item.batchNumber}</div> : ''}
                                            {item.expiryDate ? <div>Hạn: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}</div> : ''}
                                            {!item.batchNumber && !item.expiryDate && <span>-</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{(item.cost || 0).toLocaleString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {((item.cost || 0) * item.quantity).toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end border-t border-slate-100 pt-4">
                        <div className="text-right">
                            <span className="text-slate-500 mr-4">Tổng tiền phiếu:</span>
                            <span className={`text-xl font-bold ${isImport ? 'text-green-600' : 'text-orange-600'}`}>
                                {(transaction.totalAmount || 0).toLocaleString('vi-VN')} ₫
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                        <Printer className="h-4 w-4" /> In phiếu
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockMovement;