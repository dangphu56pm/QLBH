import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Category } from '../types';
import { saveProduct, deleteProduct, getCategories } from '../services/db';
import { Plus, Search, Edit2, Trash2, Package, QrCode, ScanLine, Printer, Filter, FolderOpen, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import QRCode from 'react-qr-code';

interface InventoryProps {
  products: Product[];
}

// Khai báo global variable cho html5-qrcode vì được import qua script tag
declare const Html5QrcodeScanner: any;

const Inventory: React.FC<InventoryProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // State cho QR
  const [viewQrProduct, setViewQrProduct] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // State cho Delete Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Load categories (Just for dropdown)
  const loadCategories = () => {
    setCategories(getCategories());
  };

  useEffect(() => {
    loadCategories();
    window.addEventListener('category-change', loadCategories);
    return () => window.removeEventListener('category-change', loadCategories);
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const onRequestDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleScanSuccess = (decodedText: string) => {
    setSearchTerm(decodedText);
    setIsScannerOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Kho Hàng</h2>
        <div className="flex flex-col md:flex-row w-full xl:w-auto gap-2">
          
          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-40 pl-10 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-slate-700 font-medium"
            >
              <option value="Tất cả">Tất cả</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Tìm tên, mã SP, mã vạch..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg font-medium transition-colors"
                title="Quét mã QR để tìm kiếm"
            >
                <ScanLine className="h-4 w-4" />
                <span className="hidden lg:inline">Quét Tìm</span>
            </button>

            <button 
                onClick={handleAddNew}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">Thêm mới</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Mã SP</th>
                <th className="px-4 py-3">Tên Sản Phẩm</th>
                <th className="px-4 py-3">Danh Mục</th>
                <th className="px-4 py-3 text-right">Giá Vốn</th>
                <th className="px-4 py-3 text-right">Giá Bán</th>
                <th className="px-4 py-3 text-center">Tồn Kho</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    <div className="flex flex-col">
                        <span>{product.code}</span>
                        {product.barcode && <span className="text-xs text-slate-400 flex items-center gap-1"><ScanLine className="h-3 w-3"/> {product.barcode}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{product.cost.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">{product.price.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewQrProduct(product)} 
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                        title="Xem mã QR"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(product)} className="p-1 hover:bg-blue-50 text-blue-600 rounded">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => onRequestDelete(product)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy sản phẩm nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
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
                        <option value={100}>100</option>
                    </select>
                    <span>dòng / trang</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-slate-500">
                        {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProducts.length)} trên {filteredProducts.length}
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

      {isModalOpen && (
        <ProductModal 
          product={editingProduct} 
          categories={categories}
          onClose={() => setIsModalOpen(false)} 
          onSave={(p) => {
            saveProduct(p);
            setIsModalOpen(false);
          }} 
        />
      )}

      {/* Modal quét QR */}
      {isScannerOpen && (
        <QRScannerModal 
          onClose={() => setIsScannerOpen(false)} 
          onScanSuccess={handleScanSuccess} 
        />
      )}

      {/* Modal xem QR */}
      {viewQrProduct && (
        <QRViewModal 
          product={viewQrProduct} 
          onClose={() => setViewQrProduct(null)} 
        />
      )}

      {/* Modal Xác nhận xoá */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa sản phẩm <br/>
                <span className="font-bold text-slate-800">"{productToDelete.name}"</span>?
                <br/><span className="text-xs text-red-500">Hành động này không thể hoàn tác.</span>
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
                  Xóa ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

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

const QRViewModal: React.FC<{
  product: Product;
  onClose: () => void;
}> = ({ product, onClose }) => {
  const handlePrint = () => {
    const printContent = document.getElementById('qr-print-area');
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .qr-container { text-align: center; border: 1px dashed #ccc; padding: 20px; }
              .code { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
              .name { font-size: 16px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Prioritize Barcode for QR generation if available, otherwise use Code
  const qrValue = (product.barcode && product.barcode.trim() !== '') 
    ? product.barcode 
    : (product.code && product.code.trim() !== '' ? product.code : 'UNKNOWN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Mã QR Sản Phẩm</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center space-y-4">
          <div id="qr-print-area" className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-800 mb-2">{qrValue}</div>
            <div className="bg-white p-2">
              <QRCode value={qrValue} size={180} level="M" />
            </div>
            <div className="text-slate-600 mt-2 text-center font-medium">{product.name}</div>
          </div>
          
          <div className="flex w-full gap-3 mt-4">
            <button 
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <Printer className="h-4 w-4" /> In Tem
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Modal Component (ProductModal)
const ProductModal: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Product) => void;
}> = ({ product, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      code: '',
      barcode: '',
      name: '',
      unit: 'cái',
      price: 0,
      cost: 0,
      stock: 0,
      category: categories.length > 0 ? categories[0].name : 'Khác'
    }
  );

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id || '',
      ...formData as Product
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã SP (Nội bộ)</label>
              <input 
                  required
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="VD: SP001"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã vạch / QR</label>
              <div className="flex gap-2">
                <input 
                  name="barcode"
                  value={formData.barcode || ''}
                  onChange={handleChange}
                  placeholder="Quét hoặc nhập..."
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <button 
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                  title="Quét mã"
                >
                  <ScanLine className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Sản Phẩm</label>
            <input 
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị</label>
              <input 
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tồn kho</label>
              <input 
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giá Vốn</label>
              <input 
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giá Bán</label>
              <input 
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Lưu</button>
          </div>
        </form>

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

export default Inventory;