import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Unit } from '../types';
import { saveProduct, deleteProduct, getCategories, getUnits, getSyncConfig } from '../services/db';
import { Plus, Search, Edit2, Trash2, Package, ScanLine, X, Save, Archive, FolderOpen, ChevronDown, Check, Tag, DollarSign, Layers, QrCode, AlertTriangle, LayoutGrid, List, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

declare const Html5QrcodeScanner: any;

interface InventoryProps {
  products: Product[];
}

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

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
    );
  }, [products, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" /> Kho Hàng
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
             {/* View Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg self-start sm:self-auto">
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

            <div className="flex w-full md:w-auto gap-2">
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
                            <th className="px-4 py-3">Sản phẩm</th>
                            <th className="px-4 py-3">Danh mục</th>
                            <th className="px-4 py-3 text-center">ĐVT</th>
                            <th className="px-4 py-3">Lô / Hạn SD</th>
                            <th className="px-4 py-3 text-right">Giá vốn</th>
                            <th className="px-4 py-3 text-right">Giá bán</th>
                            <th className="px-4 py-3 text-right">Lợi nhuận (%)</th>
                            <th className="px-4 py-3 text-center">Tồn kho</th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentProducts.map(product => {
                            const expiryStatus = getExpiryStatus(product.expiryDate);
                            const profit = product.price - (product.cost || 0);
                            const profitMargin = product.price ? ((profit / product.price) * 100).toFixed(1) : '0';
                            
                            return (
                            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-medium text-slate-800">{product.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{product.code}</span>
                                            {product.barcode && <span>| {product.barcode}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                                        {product.category || 'Khác'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600">{product.unit}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 text-xs font-medium">{product.batchNumber || '-'}</span>
                                        <span className={`text-xs ${expiryStatus.color} flex items-center gap-1`}>
                                            {expiryStatus.isUrgent && <AlertCircle className="h-3 w-3" />}
                                            {expiryStatus.label}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500">
                                    {product.cost ? product.cost.toLocaleString('vi-VN') : 0} ₫
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                    {product.price.toLocaleString('vi-VN')} ₫
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                            {profit.toLocaleString('vi-VN')} ₫
                                        </span>
                                        <span className={`text-[10px] font-bold px-1.5 rounded ${profit > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {profitMargin}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {product.stock}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
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
                        )})}
                         {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                                    <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>Không tìm thấy sản phẩm nào</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        // GRID VIEW (CARDS)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {currentProducts.map(product => {
                const expiryStatus = getExpiryStatus(product.expiryDate);
                const profit = product.price - (product.cost || 0);
                const profitMargin = product.price ? ((profit / product.price) * 100).toFixed(1) : '0';

                return (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                            {product.category || 'Khác'}
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleEdit(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                    <p className="text-xs text-slate-500 mb-2">{product.code} {product.barcode ? `| ${product.barcode}` : ''}</p>
                    
                    <div className="mt-auto space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Giá bán:</span>
                            <span className="font-bold text-blue-600">{product.price.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Lợi nhuận:</span>
                            <div className="text-right flex items-center gap-1">
                                <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                                    {profit.toLocaleString('vi-VN')} ₫
                                </span>
                                <span className={`text-[10px] font-bold px-1 rounded ${profit > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {profitMargin}%
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Tồn kho:</span>
                            <span className={`font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                {product.stock} {product.unit}
                            </span>
                        </div>
                        
                        {/* Batch & Expiry Info for Grid View */}
                        <div className="pt-2 mt-1 border-t border-slate-100 text-xs">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500">Lô:</span>
                                <span className="font-medium text-slate-700">{product.batchNumber || '-'}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Hạn:</span>
                                <span className={`${expiryStatus.color} flex items-center gap-1`}>
                                     {expiryStatus.isUrgent && <AlertCircle className="h-3 w-3" />}
                                     {expiryStatus.label}
                                </span>
                             </div>
                        </div>
                    </div>
                </div>
            )})}
            {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Không tìm thấy sản phẩm nào</p>
                </div>
            )}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
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
                    {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProducts.length)} trên {filteredProducts.length}
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
      
      {/* Search Scanner Modal */}
      {isSearchScannerOpen && (
        <QRScannerModal 
          onClose={() => setIsSearchScannerOpen(false)} 
          onScanSuccess={(code) => {
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
                  Xóa
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
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      code: '',
      barcode: '',
      name: '',
      unit: 'Cái',
      price: 0,
      cost: 0,
      stock: 0,
      category: categories.length > 0 ? categories[0].name : 'Khác',
      batchNumber: '',
      expiryDate: ''
    }
  );

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stock' ? Number(value) : value
    }));
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Remove dots to get raw number
    const rawValue = value.replace(/\./g, '');
    
    if (rawValue === '') {
        setFormData(prev => ({ ...prev, [name]: 0 }));
        return;
    }

    // Only allow digits
    if (/^\d+$/.test(rawValue)) {
        setFormData(prev => ({
            ...prev,
            [name]: parseInt(rawValue, 10)
        }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id || '',
      ...formData as Product
    });
  };

  // Filter Categories for Combobox
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes((formData.category || '').toLowerCase())
  );

  // Filter Units for Combobox
  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes((formData.unit || '').toLowerCase())
  );

  // Profit Calculation
  const profit = (formData.price || 0) - (formData.cost || 0);
  const profitMargin = formData.price ? ((profit / formData.price) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {product ? <Edit2 className="h-5 w-5 text-blue-600"/> : <Plus className="h-5 w-5 text-green-600"/>}
            {product ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: General Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Tên Sản Phẩm <span className="text-red-500">*</span></label>
              <input 
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="VD: Nước giải khát Coca Cola"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-medium placeholder-slate-400" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã nội bộ</label>
                    <div className="relative">
                        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input 
                            required
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="VD: SP001"
                            className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã vạch (Barcode)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input 
                                name="barcode"
                                value={formData.barcode || ''}
                                onChange={handleChange}
                                placeholder="Quét hoặc nhập..."
                                className="w-full pl-9 pr-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                            <button 
                                type="button"
                                onClick={() => setIsScannerOpen(true)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Mở máy quét"
                            >
                                <QrCode className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Classification */}
          <div>
             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" /> Phân loại & Đơn vị
             </h4>
             <div className="grid grid-cols-2 gap-4">
                {/* CATEGORY COMBOBOX */}
                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                    <div className="relative">
                        <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={(e) => {
                                handleChange(e);
                                setShowCategoryDropdown(true);
                            }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            className="w-full pl-9 pr-8 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Chọn danh mục..."
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                    {showCategoryDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)}></div>
                            <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className="p-2.5 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-0"
                                            onClick={() => {
                                                setFormData(prev => ({...prev, category: cat.name}));
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            {cat.name}
                                            {formData.category === cat.name && <Check className="h-4 w-4 text-blue-600"/>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-slate-500 italic text-center bg-slate-50">
                                        Nhập tên mới để tạo danh mục
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* UNIT COMBOBOX */}
                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Đơn vị tính</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            name="unit"
                            value={formData.unit}
                            onChange={(e) => {
                                handleChange(e);
                                setShowUnitDropdown(true);
                            }}
                            onFocus={() => setShowUnitDropdown(true)}
                            className="w-full pl-9 pr-8 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Chọn đơn vị..."
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                    {showUnitDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowUnitDropdown(false)}></div>
                            <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredUnits.length > 0 ? (
                                    filteredUnits.map(u => (
                                        <div
                                            key={u.id}
                                            className="p-2.5 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-0"
                                            onClick={() => {
                                                setFormData(prev => ({...prev, unit: u.name}));
                                                setShowUnitDropdown(false);
                                            }}
                                        >
                                            {u.name}
                                            {formData.unit === u.name && <Check className="h-4 w-4 text-blue-600"/>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-slate-500 italic text-center bg-slate-50">
                                        Nhập tên mới để tạo đơn vị
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
             </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Pricing & Stock */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Kho & Giá cả
             </h4>
             
             <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Giá Vốn</label>
                    <div className="relative">
                        <input 
                            type="text"
                            name="cost"
                            value={formData.cost ? formData.cost.toLocaleString('vi-VN') : ''}
                            onChange={handleNumberInput}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                            placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">đ</span>
                    </div>
                </div>
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-blue-600 mb-1.5">Giá Bán</label>
                    <div className="relative">
                        <input 
                            type="text"
                            name="price"
                            value={formData.price ? formData.price.toLocaleString('vi-VN') : ''}
                            onChange={handleNumberInput}
                            className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700" 
                            placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-bold">đ</span>
                    </div>
                </div>
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Tồn kho</label>
                    <input 
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center" 
                    />
                </div>
             </div>

             {/* Profit Calculation Preview */}
             <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500">Lợi nhuận dự kiến:</span>
                <div className="flex items-center gap-3">
                    <span className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {profit > 0 ? '+' : ''}{profit.toLocaleString('vi-VN')} đ
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${profit > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {profitMargin}%
                    </span>
                </div>
             </div>
          </div>

          {/* Section 4: Batch Tracking */}
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Số Lô (Batch)</label>
              <input 
                name="batchNumber"
                value={formData.batchNumber || ''}
                onChange={handleChange}
                placeholder="VD: L001"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hạn sử dụng</label>
              <input 
                type="date"
                name="expiryDate"
                value={formData.expiryDate || ''}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors"
            >
                Hủy bỏ
            </button>
            <button 
                type="button" 
                onClick={handleSubmit} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
                <Save className="h-5 w-5" />
                {product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </button>
        </div>

        {isScannerOpen && (
          <QRScannerModal 
            onClose={() => setIsScannerOpen(false)} 
            onScanSuccess={(code) => {
              setFormData(prev => ({...prev, barcode: code}));
              setIsScannerOpen(false);
            }} 
          />
        )}
      </div>
    </div>
  );
};

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
            <ScanLine className="h-5 w-5 text-blue-600" /> Quét mã
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <div id="reader" className="w-full"></div>
          <p className="text-center text-sm text-slate-500 mt-4">
            Đưa mã QR/Barcode vào khung hình để quét
          </p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;