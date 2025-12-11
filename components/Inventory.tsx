
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Unit } from '../types';
import { saveProduct, deleteProduct, getCategories, getUnits, getSyncConfig } from '../services/db';
import { Plus, Search, Edit2, Trash2, Package, ScanLine, X, Save, Archive, FolderOpen, ChevronDown, Check, Tag, DollarSign, Layers, QrCode, AlertTriangle, LayoutGrid, List, Calendar, AlertCircle, ChevronLeft, ChevronRight, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

declare const Html5QrcodeScanner: any;

interface InventoryProps {
  products: Product[];
}

type SortKey = keyof Product;
type SortDirection = 'asc' | 'desc';

const Inventory: React.FC<InventoryProps> = ({ products }) => {
  // const [products, setProducts] = useState<Product[]>([]); // Managed by parent
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // State for Search Scanner
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  
  // View Mode: 'list' (Table) or 'grid' (Cards)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = () => {
    // setProducts(getProducts()); // Managed by parent
    setCategories(getCategories());
    setUnits(getUnits());
    setExpiryAlertDays(getSyncConfig().expiryAlertDays);
  };

  useEffect(() => {
    loadData();
    // window.addEventListener('db-change', loadData); // Managed by parent via props
    window.addEventListener('category-change', loadData);
    window.addEventListener('unit-change', loadData);
    return () => {
      // window.removeEventListener('db-change', loadData);
      window.removeEventListener('category-change', loadData);
      window.removeEventListener('unit-change', loadData);
    };
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = (product: Product) => {
      setProductToDelete(product);
  };

  const confirmDelete = () => {
      if (productToDelete) {
          deleteProduct(productToDelete.id);
          setProductToDelete(null);
      }
  };

  const printProductLabel = (product: Product) => {
    const printWindow = window.open('', '', 'width=450,height=600');
    if (!printWindow) return;

    // Use barcode if available, otherwise internal code
    const codeToPrint = product.barcode || product.code;
    // URL encoded code for API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(codeToPrint)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In Tem: ${product.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; background: #f0f0f0; }
          .label-container { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; width: 280px; border: 1px dashed #ccc; }
          .shop-name { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 5px; letter-spacing: 1px; }
          .product-name { font-weight: bold; font-size: 15px; margin-bottom: 8px; line-height: 1.3; color: #000; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .qr-wrapper { margin: 5px 0; }
          .qr-img { width: 120px; height: 120px; object-fit: contain; }
          .code { font-family: monospace; font-size: 14px; color: #333; letter-spacing: 1px; margin-bottom: 5px; font-weight: 600; }
          .price { font-size: 22px; font-weight: 800; color: #000; margin-top: 5px; border-top: 1px dotted #eee; pt-2; }
          
          @media print {
            body { background: white; padding: 0; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .no-print { display: none !important; }
            .label-container { box-shadow: none; border: 2px solid #000; margin: 0; width: 300px; height: auto; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="shop-name">Cửa Hàng Tạp Hóa</div>
          <div class="product-name">${product.name}</div>
          <div class="qr-wrapper">
             <img src="${qrUrl}" class="qr-img" />
          </div>
          <div class="code">${codeToPrint}</div>
          <div class="price">${product.price.toLocaleString('vi-VN')} ₫</div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
           <p style="margin-bottom: 15px; color: #555; font-size: 14px;">Đợi mã QR tải xong, sau đó nhấn nút in.</p>
           <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.5);">🖨️ In Tem Ngay</button>
           <br/><br/>
           <button onclick="window.close()" style="background: #e5e7eb; color: #374151; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Đóng</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // 1. Filter
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
    );
  }, [products, searchTerm]);

  // 2. Sort
  const sortedProducts = useMemo(() => {
    let sortableItems = [...filteredProducts];
    sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';

        // Handle numeric sorting for price and stock
        if (typeof aValue === 'number' && typeof bValue === 'number') {
             return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  // 3. Paginate
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper function to check expiry status
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: '-', color: 'text-slate-400', isUrgent: false };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: `Đã hết hạn (${Math.abs(diffDays)} ngày)`, color: 'text-red-600 font-bold', isUrgent: true };
    if (diffDays <= expiryAlertDays) return { label: `Còn ${diffDays} ngày`, color: 'text-orange-600 font-bold', isUrgent: true };
    
    return { label: new Date(expiryDate).toLocaleDateString('vi-VN'), color: 'text-slate-600', isUrgent: false };
  };

  // Helper to render sort icon
  const getSortIcon = (key: SortKey) => {
      if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
      return sortConfig.direction === 'asc' 
          ? <ArrowUp className="h-3 w-3 text-blue-600" /> 
          : <ArrowDown className="h-3 w-3 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" /> Kho Hàng
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
             {/* View Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg self-start sm:self-auto order-2 sm:order-1">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Dạng danh sách"
                >
                    <List className="h-5 w-5" />
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Dạng lưới"
                >
                    <LayoutGrid className="h-5 w-5" />
                </button>
            </div>

            {/* Sort Dropdown (Visible on Mobile or Grid View) */}
            <div className="w-full sm:w-auto order-3 sm:order-2">
                 <select 
                    className="w-full sm:w-auto border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={`${sortConfig.key}-${sortConfig.direction}`}
                    onChange={(e) => {
                        const [key, direction] = e.target.value.split('-');
                        setSortConfig({ key: key as SortKey, direction: direction as SortDirection });
                    }}
                >
                    <option value="name-asc">Tên (A-Z)</option>
                    <option value="name-desc">Tên (Z-A)</option>
                    <option value="price-asc">Giá (Thấp-Cao)</option>
                    <option value="price-desc">Giá (Cao-Thấp)</option>
                    <option value="stock-asc">Tồn (Thấp-Cao)</option>
                    <option value="stock-desc">Tồn (Cao-Thấp)</option>
                    <option value="id-desc">Mới nhất</option>
                </select>
            </div>

            <div className="flex w-full md:w-auto gap-2 order-1 sm:order-3">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input 
                        type="text" 
                        placeholder="Tìm tên, mã SP..." 
                        className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        onClick={() => setIsSearchScannerOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Quét mã để tìm"
                    >
                        <ScanLine className="h-4 w-4" />
                    </button>
                </div>
                <button 
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm SP</span>
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        // TABLE VIEW (DATA GRID)
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                                <div className="flex items-center gap-1">
                                    Sản phẩm {getSortIcon('name')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('category')}>
                                <div className="flex items-center gap-1">
                                    Danh mục {getSortIcon('category')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('price')}>
                                <div className="flex items-center justify-end gap-1">
                                    Giá bán {getSortIcon('price')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('stock')}>
                                <div className="flex items-center justify-end gap-1">
                                    Tồn kho {getSortIcon('stock')}
                                </div>
                            </th>
                            <th className="px-4 py-3">Lô / Hạn SD</th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentProducts.map(product => {
                            const expiryStatus = getExpiryStatus(product.expiryDate);
                            return (
                                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-bold text-slate-800">{product.name}</p>
                                            <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{product.code}</span>
                                                {product.unit && <span>ĐVT: {product.unit}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{product.category}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                        {product.price.toLocaleString('vi-VN')} ₫
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-bold px-2 py-1 rounded-full text-xs ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-col">
                                            {product.batchNumber && <span className="text-slate-500 text-xs">Lô: {product.batchNumber}</span>}
                                            <span className={`text-xs ${expiryStatus.color}`}>
                                                Hạn: {expiryStatus.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => printProductLabel(product)}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                title="In Tem"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(product)} 
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Sửa"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(product)} 
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                         {sortedProducts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package className="h-10 w-10 mb-2 opacity-20" />
                                        <p>Không tìm thấy sản phẩm nào.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        // GRID VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {currentProducts.map(product => {
                const expiryStatus = getExpiryStatus(product.expiryDate);
                return (
                <div key={product.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                            {product.category || 'Khác'}
                        </div>
                         <div className="flex gap-1">
                            <button onClick={() => printProductLabel(product)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="In Tem"><Printer className="h-4 w-4" /></button>
                            <button onClick={() => handleEdit(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Sửa"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
                    
                    <div className="space-y-2 mt-auto">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Mã SP:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{product.code}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Đơn vị:</span>
                            <span className="text-slate-700">{product.unit || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Tồn kho:</span>
                            <span className={`font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                                {product.stock}
                            </span>
                        </div>
                         {expiryStatus.isUrgent && (
                            <div className={`text-xs mt-2 p-2 rounded bg-opacity-10 flex items-center gap-1 ${expiryStatus.color.includes('red') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                <AlertCircle className="h-3 w-3" />
                                {expiryStatus.label}
                            </div>
                        )}
                        <div className="pt-3 mt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Giá bán</span>
                            <span className="font-bold text-blue-600 text-lg">{product.price.toLocaleString('vi-VN')} ₫</span>
                        </div>
                    </div>
                </div>
            )})}
             {sortedProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                    Không tìm thấy sản phẩm nào.
                </div>
            )}
        </div>
      )}

      {/* Pagination Controls */}
      {sortedProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-600">
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
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>sản phẩm / trang</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                    {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedProducts.length)} trên {sortedProducts.length}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
        <ProductModal 
          product={editingProduct} 
          categories={categories}
          units={units}
          onClose={() => setIsModalOpen(false)} 
          onSave={(p) => {
            saveProduct(p);
            setIsModalOpen(false);
          }} 
        />
      )}

      {/* QR Scanner Modal for Search */}
      {isSearchScannerOpen && (
         <QRScannerModal 
            onClose={() => setIsSearchScannerOpen(false)}
            onScan={(code) => {
                setSearchTerm(code);
                setIsSearchScannerOpen(false);
            }}
         />
      )}

       {/* Delete Confirmation Modal */}
       {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-800">"{productToDelete.name}"</span>?
                <br/>
                <span className="text-sm text-red-500 mt-2 block">Hành động này không thể hoàn tác.</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-200"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductModal: React.FC<{
  product: Product | null;
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onSave: (p: Product) => void;
}> = ({ product, categories, units, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>(() => {
    if (product) return { ...product };
    return {
      name: '',
      code: '',
      unit: units.length > 0 ? units[0].name : 'Cái',
      price: 0,
      cost: 0,
      stock: 0,
      category: categories.length > 0 ? categories[0].name : 'Khác',
      barcode: '',
      batchNumber: '',
      expiryDate: ''
    };
  });

  // Auto generate code if adding new
  useEffect(() => {
    if (!product && !formData.code) {
        const random = Math.floor(1000 + Math.random() * 9000);
        setFormData(prev => ({ ...prev, code: `SP${random}` }));
    }
  }, []);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id || '',
      ...formData as Product
    });
  };

  // State for Modal Scanner
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
            <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên sản phẩm</label>
                    <input 
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="VD: Mì Hảo Hảo"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã sản phẩm (Nội bộ)</label>
                    <input 
                        required
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã vạch (Quét)</label>
                    <div className="flex gap-2">
                        <input 
                            value={formData.barcode || ''}
                            onChange={(e) => handleChange('barcode', e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                            placeholder="Quét mã vạch..."
                        />
                        <button 
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        >
                            <ScanLine className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục</label>
                    <div className="relative">
                        <select
                            value={formData.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                        >
                            <option value="Khác">Khác</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị tính</label>
                    <div className="relative">
                         <select
                            value={formData.unit}
                            onChange={(e) => handleChange('unit', e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                        >
                            {units.map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                             {/* Fallback if unit not in list */}
                             {!units.find(u => u.name === formData.unit) && (
                                 <option value={formData.unit}>{formData.unit}</option>
                             )}
                        </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá bán</label>
                    <div className="relative">
                        <input 
                            type="number"
                            min="0"
                            required
                            value={formData.price}
                            onChange={(e) => handleChange('price', parseInt(e.target.value))}
                            className="w-full p-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">đ</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá vốn</label>
                    <div className="relative">
                        <input 
                            type="number"
                            min="0"
                            value={formData.cost}
                            onChange={(e) => handleChange('cost', parseInt(e.target.value))}
                            className="w-full p-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">đ</span>
                    </div>
                </div>
                 
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Tồn kho ban đầu</label>
                     <input 
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-2">
                 <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <Layers className="h-4 w-4 text-orange-500" /> Thông tin Lô & Hạn sử dụng
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số lô (Batch)</label>
                        <input 
                            value={formData.batchNumber || ''}
                            onChange={(e) => handleChange('batchNumber', e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="VD: L001"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hạn sử dụng</label>
                        <input 
                            type="date"
                            value={formData.expiryDate || ''}
                            onChange={(e) => handleChange('expiryDate', e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                     </div>
                 </div>
            </div>
            </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
            <button type="submit" form="productForm" className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-600/20 font-bold">Lưu Sản Phẩm</button>
        </div>
      </div>

      {showScanner && (
        <QRScannerModal 
            onClose={() => setShowScanner(false)}
            onScan={(code) => {
                handleChange('barcode', code);
                setShowScanner(false);
            }}
        />
      )}
    </div>
  );
};

// Reuseable QR Scanner Modal
const QRScannerModal: React.FC<{
    onClose: () => void;
    onScan: (code: string) => void;
}> = ({ onClose, onScan }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader-modal",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(
            (decodedText: string) => {
                scanner.clear();
                onScan(decodedText);
            },
            (error: any) => {}
        );

        return () => {
            try { scanner.clear(); } catch(e) {}
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
             <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Quét mã vạch</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <div className="p-4">
                    <div id="qr-reader-modal" className="w-full"></div>
                </div>
             </div>
        </div>
    );
};

export default Inventory;
