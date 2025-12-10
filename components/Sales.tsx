import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, Product, OrderItem, Order, User } from '../types';
import { createOrder, saveCustomer, deleteOrder } from '../services/db';
import { Search, ShoppingCart, Trash2, Plus, Minus, UserCheck, CheckCircle, X, User as UserIcon, ScanLine, Printer, ArrowRight, History, ListPlus, FileText, Calendar, UserPlus, Wallet, CreditCard, Eye, MapPin, Phone, AlertTriangle } from 'lucide-react';

interface SalesProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  currentUser: User | null;
}

// Khai báo global variable cho html5-qrcode
declare const Html5QrcodeScanner: any;

const Sales: React.FC<SalesProps> = ({ products, customers, orders, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  
  // --- POS States ---
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Discount & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Partial<Order> | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // --- Quick Add Customer State ---
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // --- History States ---
  const [historySearch, setHistorySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // --- Order Detail State ---
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // --- Delete Order State ---
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
    );
  }, [products, productSearch]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // Lọc lịch sử đơn hàng
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by search term
    if (historySearch) {
      const lower = historySearch.toLowerCase();
      result = result.filter(o => 
        o.customerName.toLowerCase().includes(lower) || 
        o.id.includes(lower) ||
        (o.staffName && o.staffName.toLowerCase().includes(lower))
      );
    }

    // Filter by Start Date
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.date) >= start);
    }

    // Filter by End Date
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.date) <= end);
    }

    // Sort newest first
    return result.reverse();
  }, [orders, historySearch, startDate, endDate]);

  // Calculated Totals
  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalAmount = Math.max(0, subTotal - discount);

  // --- POS Logic ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert('Sản phẩm đã hết hàng!');
    
    setCart(prev => {
      const exist = prev.find(item => item.productId === product.id);
      if (exist) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }];
    });
    setProductSearch('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        const product = products.find(p => p.id === productId);
        if (product && newQty > product.stock) {
            alert(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
            return item;
        }
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleSaveNewCustomer = (data: { name: string; phone: string; address: string }) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newCustomer: Customer = {
        id: newId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        debt: 0,
        gender: 'Khác' 
    };
    saveCustomer(newCustomer);
    setSelectedCustomerId(newId);
    setCustomerSearch('');
    setIsAddCustomerModalOpen(false);
  };

  const handlePayment = () => {
    if (!selectedCustomerId) return alert('Vui lòng chọn khách hàng');
    if (cart.length === 0) return alert('Giỏ hàng trống');

    const debt = finalAmount - paidAmount;
    const date = new Date().toISOString();
    
    const newOrderData: Omit<Order, 'id'> = {
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name || 'Khách lẻ',
      date: date,
      items: [...cart], 
      totalAmount: subTotal,
      discount: discount,
      finalAmount: finalAmount,
      paidAmount,
      debtAmount: Math.max(0, debt),
      status: 'completed',
      staffName: currentUser?.name || 'Unknown' // Save current user
    };

    createOrder(newOrderData);
    
    // Giả lập ID để in ngay lập tức
    setLastOrder({ ...newOrderData, id: Date.now().toString() });
    setOrderSuccess(true);
  };

  const startNewOrder = () => {
    setOrderSuccess(false);
    setCart([]);
    setDiscount(0);
    setPaidAmount(0);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setLastOrder(null);
  };

  const onRequestDeleteOrder = (id: string) => {
    setOrderToDelete(id);
  };

  const confirmDeleteOrder = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };

  // --- Print Logic (Reusable) ---
  const printInvoice = (order: Order | Partial<Order>) => {
    if (!order) return;

    // Tìm thông tin khách hàng mới nhất từ danh sách customers
    // Nếu không tìm thấy (khách đã xóa hoặc null), dùng thông tin fallback
    const customerInfo = customers.find(c => c.id === order.customerId);
    const customerPhone = customerInfo ? customerInfo.phone : '';
    const customerAddress = customerInfo ? customerInfo.address : '';

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const orderDate = new Date(order.date || '').toLocaleString('vi-VN');
    const orderFinalAmount = order.finalAmount ?? order.totalAmount;
    const staff = order.staffName || '';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa Đơn #${order.id}</title>
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
          <div>Điện thoại: 0909 123 456</div>
          <div class="title">HÓA ĐƠN BÁN HÀNG</div>
        </div>

        <div class="info">
          <p>Mã hóa đơn: #${order.id}</p>
          <p>Ngày: ${orderDate}</p>
          <p>Thu ngân: ${staff}</p>
          <p>Khách hàng: ${order.customerName}</p>
          <p>SĐT: ${customerPhone}</p>
          <p>Địa chỉ: ${customerAddress}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Tên SP</th>
              <th class="text-center" style="width: 15%">SL</th>
              <th class="text-right" style="width: 20%">Đơn giá</th>
              <th class="text-right" style="width: 25%">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.price.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.total.toLocaleString('vi-VN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <b>Tổng tiền hàng:</b>
            <b>${(order.totalAmount || 0).toLocaleString('vi-VN')} đ</b>
          </div>
          ${order.discount && order.discount > 0 ? `
          <div class="total-row">
            <span>Giảm giá:</span>
            <span>-${order.discount.toLocaleString('vi-VN')} đ</span>
          </div>
          ` : ''}
          <div class="total-row">
            <b>Khách phải trả:</b>
            <b>${(orderFinalAmount || 0).toLocaleString('vi-VN')} đ</b>
          </div>
          <div class="total-row">
            <span>Đã thanh toán:</span>
            <span>${(order.paidAmount || 0).toLocaleString('vi-VN')} đ</span>
          </div>
          <div class="total-row">
            <span>Còn nợ:</span>
            <span>${(order.debtAmount || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <div class="footer">
          <p>Cảm ơn quý khách và hẹn gặp lại!</p>
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

  const handleScanProduct = (code: string) => {
    // Check both 'code' (internal) and 'barcode' (scanned)
    const product = products.find(p => p.code === code || p.barcode === code);
    
    if (product) {
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

  // --- Render Sections ---

  const renderTabs = () => (
    <div className="flex bg-slate-200 p-1 rounded-xl mb-6 w-fit">
      <button 
        onClick={() => setActiveTab('pos')}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'pos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
      >
        <ListPlus className="h-4 w-4" /> Tạo đơn hàng
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
      >
        <History className="h-4 w-4" /> Lịch sử đơn hàng
      </button>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" /> Danh sách hóa đơn
        </h3>
        
        <div className="flex flex-col md:flex-row w-full xl:w-auto gap-3">
            {/* Date Filters */}
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                       <span className="text-slate-400 text-xs font-medium">Từ</span>
                    </div>
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full md:w-36 pl-8 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                    />
                </div>
                <div className="relative flex-1 md:flex-none">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                       <span className="text-slate-400 text-xs font-medium">Đến</span>
                    </div>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full md:w-36 pl-8 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                    />
                </div>
            </div>

            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                    type="text" 
                    placeholder="Tìm khách, nhân viên..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Mã Đơn</th>
                <th className="px-4 py-3">Ngày lập</th>
                <th className="px-4 py-3">Nhân viên</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-right">Đã thanh toán</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const displayTotal = order.finalAmount ?? order.totalAmount;
                return (
                <tr 
                  key={order.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setViewingOrder(order)}
                >
                  <td className="px-4 py-3 font-mono text-slate-500">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {new Date(order.date).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3 text-slate-400" />
                      {order.staffName || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{order.customerName}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{displayTotal.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{order.paidAmount.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.debtAmount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {order.debtAmount > 0 ? 'Còn nợ' : 'Hoàn thành'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                        <button 
                        onClick={() => setViewingOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors font-medium text-xs"
                        title="Xem chi tiết"
                        >
                        <Eye className="h-3 w-3" /> Chi tiết
                        </button>
                        <button 
                        onClick={() => printInvoice(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-700 rounded-md transition-colors font-medium text-xs"
                        title="In lại hóa đơn"
                        >
                        <Printer className="h-3 w-3" /> In HD
                        </button>
                        <button 
                        onClick={() => onRequestDeleteOrder(order.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors font-medium text-xs"
                        title="Xóa đơn hàng"
                        >
                        <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa đơn hàng</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa đơn hàng này?<br/>
                <span className="text-sm text-green-600 block mt-2 font-medium">Hệ thống sẽ hoàn lại tồn kho và cập nhật lại công nợ khách hàng.</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmDeleteOrder}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-200"
                >
                  Xóa đơn hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPOS = () => {
    if (orderSuccess) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-in fade-in zoom-in duration-300">
          <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Đơn hàng thành công!</h2>
          <p className="text-slate-500 mb-8 text-center max-w-md">
            Đơn hàng đã được lưu vào hệ thống. Kho hàng và công nợ khách hàng đã được cập nhật.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button 
              onClick={() => printInvoice(lastOrder!)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
            >
              <Printer className="h-5 w-5" /> In hóa đơn
            </button>
            
            <button 
              onClick={startNewOrder}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
            >
              Bán đơn mới <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-160px)] gap-6">
        {/* Left: Product Selection & Cart */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex gap-2">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <input
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                          placeholder="Tìm sản phẩm để thêm..."
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
                                      <span className="font-bold text-blue-600">{p.price.toLocaleString('vi-VN')}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-lg flex items-center justify-center transition-colors"
                      title="Quét mã vạch"
                  >
                      <ScanLine className="h-6 w-6" />
                  </button>
              </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600 flex justify-between">
                  <span>Sản phẩm trong đơn ({cart.length})</span>
                  <button onClick={() => setCart([])} className="text-red-500 text-sm hover:underline">Xóa tất cả</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                          <div className="flex-1">
                              <h4 className="font-medium text-slate-800">{item.productName}</h4>
                              <p className="text-sm text-blue-600">{item.price.toLocaleString('vi-VN')} ₫</p>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                  <button 
                                      onClick={() => updateQuantity(item.productId, -1)} 
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-600 transition-colors"
                                  >
                                      <Minus className="h-4 w-4"/>
                                  </button>
                                  <span className="w-10 text-center font-bold text-slate-800 text-lg">{item.quantity}</span>
                                  <button 
                                      onClick={() => updateQuantity(item.productId, 1)} 
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                                  >
                                      <Plus className="h-4 w-4"/>
                                  </button>
                              </div>
                              <div className="w-24 text-right font-bold text-slate-800">
                                  {item.total.toLocaleString('vi-VN')}
                              </div>
                              <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          </div>
                      </div>
                  ))}
                  {cart.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                          <p>Chưa có sản phẩm nào</p>
                      </div>
                  )}
              </div>
          </div>
        </div>

        {/* Right: Customer & Payment - Refactored into Cards */}
        <div className="w-full lg:w-96 flex flex-col gap-4 h-auto lg:h-full">
            
            {/* 1. Customer Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 z-20">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-blue-600"/> Khách hàng
                </h3>
                
                {/* Search Input Container */}
                <div className="relative">
                    {!selectedCustomer ? (
                        <>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                            <Search className="ml-3 text-slate-400 h-5 w-5" />
                            <input
                                className="w-full p-2.5 bg-transparent outline-none text-slate-800"
                                placeholder="Tìm khách hàng..."
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setShowCustomerDropdown(true);
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                            />
                        </div>
                        {showCustomerDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto flex flex-col">
                              {filteredCustomers.map(c => (
                                  <div 
                                      key={c.id} 
                                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                      onClick={() => handleSelectCustomer(c)}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                              <UserIcon className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="font-medium text-slate-800">{c.name}</p>
                                              <p className="text-xs text-slate-500">{c.phone}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              
                              <div 
                                onClick={() => {
                                    setIsAddCustomerModalOpen(true);
                                    setShowCustomerDropdown(false);
                                }}
                                className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-center gap-2 text-blue-600 font-medium border-t border-slate-100 transition-colors sticky bottom-0 bg-white"
                              >
                                <UserPlus className="h-4 w-4" />
                                {filteredCustomers.length === 0 ? 'Không tìm thấy. Thêm mới?' : 'Thêm khách hàng mới'}
                              </div>
                          </div>
                      )}
                      {showCustomerDropdown && (
                          <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>
                      )}
                      </>
                    ) : (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-3 relative animate-in fade-in zoom-in duration-200">
                            <button 
                                onClick={() => setSelectedCustomerId('')}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded-full transition-all"
                                title="Bỏ chọn"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="flex items-start gap-3">
                                <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm">
                                    <UserCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{selectedCustomer.name}</p>
                                    <p className="text-slate-600 text-xs">{selectedCustomer.phone}</p>
                                    {selectedCustomer.debt > 0 && (
                                        <div className="flex items-center gap-1 mt-1 text-xs">
                                            <span className="text-slate-500">Nợ cũ:</span>
                                            <span className="font-bold text-red-600">{selectedCustomer.debt.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Payment Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-600"/> Thanh toán
                </h3>
                
                <div className="space-y-4">
                     {/* Summary Info with Discount */}
                     <div className="flex justify-between items-center text-sm text-slate-600">
                        <span>Tổng tiền hàng:</span>
                        <span className="font-bold text-slate-800">{subTotal.toLocaleString('vi-VN')}</span>
                     </div>
                     
                     {/* Discount Input */}
                     <div className="flex justify-between items-center">
                        <label className="text-sm text-slate-600">Giảm giá:</label>
                        <div className="w-32 relative">
                            <input 
                                type="number"
                                className="w-full py-1.5 px-2 text-right border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                value={discount}
                                onChange={e => setDiscount(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                            />
                        </div>
                     </div>
                     
                     <div className="h-px bg-slate-100 my-2"></div>

                     {/* Final Total & Debt Summary */}
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium uppercase">Khách cần trả</p>
                            <p className="text-xl font-bold text-blue-600">{finalAmount.toLocaleString('vi-VN')}</p>
                        </div>
                         <div className={`bg-slate-50 p-3 rounded-lg border border-slate-100 ${
                             (finalAmount - paidAmount) > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'
                         }`}>
                            <p className="text-xs text-slate-500 font-medium uppercase">Còn nợ</p>
                            <p className={`text-xl font-bold ${(finalAmount - paidAmount) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {Math.max(0, finalAmount - paidAmount).toLocaleString('vi-VN')}
                            </p>
                        </div>
                     </div>

                     {/* Paid Amount Input */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Khách thanh toán</label>
                        <div className="relative group">
                             <input 
                                type="number"
                                className="w-full p-3 pl-12 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-xl transition-all"
                                value={paidAmount}
                                onChange={e => setPaidAmount(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-200 text-slate-600 rounded-md px-2 py-0.5 text-xs font-bold">
                                VND
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={() => setPaidAmount(finalAmount)}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                Trả đủ
                            </button>
                             <button 
                                onClick={() => setPaidAmount(0)}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                Xóa
                            </button>
                        </div>
                     </div>
                </div>

                <div className="mt-auto pt-6">
                    <button 
                        onClick={handlePayment}
                        disabled={cart.length === 0 || !selectedCustomerId}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/30 transition-all transform active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>Thanh toán & In</span>
                            <Printer className="h-5 w-5 opacity-80" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderTabs()}
      
      {activeTab === 'pos' ? renderPOS() : renderHistory()}
      
      {/* Modal quét QR */}
      {isScannerOpen && (
        <SalesQRScannerModal 
          onClose={() => setIsScannerOpen(false)} 
          onScan={handleScanProduct}
        />
      )}

      {/* Modal Thêm Khách Hàng Nhanh */}
      {isAddCustomerModalOpen && (
        <QuickCustomerModal 
            initialName={customerSearch}
            onClose={() => setIsAddCustomerModalOpen(false)}
            onSave={handleSaveNewCustomer}
        />
      )}

      {/* Modal Chi tiết đơn hàng */}
      {viewingOrder && (
        <OrderDetailModal 
          order={viewingOrder}
          customers={customers}
          onClose={() => setViewingOrder(null)}
          onPrint={() => printInvoice(viewingOrder)}
        />
      )}
    </div>
  );
};

// Component quét mã dành riêng cho Sales
const SalesQRScannerModal: React.FC<{
    onClose: () => void;
    onScan: (code: string) => { success: boolean; name: string };
  }> = ({ onClose, onScan }) => {
    const [lastScanned, setLastScanned] = useState<{code: string, name: string} | null>(null);
    const lastCodeRef = useRef<string>('');
    const timeoutRef = useRef<any>(null);
  
    useEffect(() => {
      const scanner = new Html5QrcodeScanner(
        "sales-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
  
      scanner.render(
        (decodedText: string) => {
          if (decodedText === lastCodeRef.current) return;
  
          const result = onScan(decodedText);
          if (result.success) {
            lastCodeRef.current = decodedText;
            setLastScanned({ code: decodedText, name: result.name });
            
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                lastCodeRef.current = '';
            }, 2000);
          }
        },
        (error: any) => {}
      );
  
      return () => {
        try { scanner.clear(); } catch (error) {}
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [onScan]);
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-blue-600" /> Quét mã bán hàng
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
          </div>
          <div className="p-4">
            <div id="sales-reader" className="w-full"></div>
            <div className="mt-4 text-center h-12">
                {lastScanned ? (
                    <div className="animate-in fade-in slide-in-from-bottom duration-300">
                        <p className="text-green-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle className="h-4 w-4"/> Đã thêm: {lastScanned.name}
                        </p>
                        <p className="text-xs text-slate-400">{lastScanned.code}</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Đưa mã sản phẩm vào khung hình</p>
                )}
            </div>
            <button onClick={onClose} className="w-full mt-2 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200">
                Hoàn tất quét
            </button>
          </div>
        </div>
      </div>
    );
  };

// Component Modal Thêm Khách Hàng Nhanh
const QuickCustomerModal: React.FC<{
    initialName: string;
    onClose: () => void;
    onSave: (data: { name: string; phone: string; address: string }) => void;
}> = ({ initialName, onClose, onSave }) => {
    const [name, setName] = useState(initialName || '');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, phone, address });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Thêm khách hàng nhanh</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên khách hàng</label>
                        <input 
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                        <input 
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                        <input 
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 mt-2">
                        Lưu & Chọn
                    </button>
                </form>
            </div>
        </div>
    );
};

// Component Modal Chi tiết đơn hàng
const OrderDetailModal: React.FC<{
  order: Order;
  customers: Customer[];
  onClose: () => void;
  onPrint: () => void;
}> = ({ order, customers, onClose, onPrint }) => {
  const customer = customers.find(c => c.id === order.customerId);
  const displayTotal = order.finalAmount ?? order.totalAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Chi tiết đơn hàng</h3>
            <p className="text-sm text-slate-500 font-mono">#{order.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Thông tin đơn</h4>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{new Date(order.date).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <UserIcon className="h-4 w-4 text-slate-400" />
                <span>Nhân viên: {order.staffName || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  order.debtAmount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>
                  {order.debtAmount > 0 ? 'Chưa thanh toán hết' : 'Đã hoàn thành'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Khách hàng</h4>
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <UserIcon className="h-4 w-4 text-blue-500" />
                <span>{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{customer?.phone || '---'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="truncate max-w-[200px]">{customer?.address || '---'}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3 text-center">SL</th>
                  <th className="px-4 py-3 text-right">Đơn giá</th>
                  <th className="px-4 py-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.price.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{item.total.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-slate-600">
              <span>Tổng tiền hàng</span>
              <span className="font-bold text-slate-800">{order.totalAmount.toLocaleString('vi-VN')} ₫</span>
            </div>
            {order.discount && order.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                    <span>Giảm giá</span>
                    <span className="font-bold text-slate-800">-{order.discount.toLocaleString('vi-VN')} ₫</span>
                </div>
            )}
             <div className="flex justify-between text-slate-600">
              <span>Khách phải trả</span>
              <span className="font-bold text-blue-600">{(displayTotal).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Đã thanh toán</span>
              <span className="font-bold text-green-600">{order.paidAmount.toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Còn nợ</span>
              <span className="font-bold text-red-600">{order.debtAmount.toLocaleString('vi-VN')} ₫</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                <Printer className="h-4 w-4" /> In hóa đơn
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sales;