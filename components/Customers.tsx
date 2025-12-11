
import React, { useState, useEffect, useMemo } from 'react';
import { Customer } from '../types';
import { saveCustomer, deleteCustomer } from '../services/db';
import { Plus, Search, Edit2, Phone, MapPin, User, Calendar, Database, Trash2, AlertTriangle, Users, LayoutGrid, List, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
}

type SortKey = keyof Customer;
type SortDirection = 'asc' | 'desc';

const Customers: React.FC<CustomersProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // View Mode: 'list' (Table) or 'grid' (Cards)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  // State for Delete Modal
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 1. Filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.parentsName && c.parentsName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  // 2. Sort
  const sortedCustomers = useMemo(() => {
    let sortableItems = [...filteredCustomers];
    sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  // 3. Paginate
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = sortedCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

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

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const onRequestDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
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
            <Users className="h-8 w-8 text-blue-600" /> Khách Hàng
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
                    <option value="debt-desc">Nợ nhiều nhất</option>
                    <option value="debt-asc">Nợ ít nhất</option>
                    <option value="id-desc">Mới nhất</option>
                </select>
            </div>

            <div className="flex w-full md:w-auto gap-2 order-1 sm:order-3">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input 
                    type="text" 
                    placeholder="Tìm tên, SĐT, bố mẹ..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm</span>
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        // TABLE VIEW
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                                <div className="flex items-center gap-1">
                                    Khách hàng {getSortIcon('name')}
                                </div>
                            </th>
                            <th className="px-4 py-3">Liên hệ</th>
                            <th className="px-4 py-3">Địa chỉ</th>
                            <th className="px-4 py-3">Thông tin</th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('debt')}>
                                 <div className="flex items-center justify-end gap-1">
                                    Công nợ {getSortIcon('debt')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-bold text-slate-800">{customer.name}</p>
                                        {customer.parentsName && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Users className="h-3 w-3" /> {customer.parentsName}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                    {customer.phone || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                                    {customer.address || '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1 flex-wrap">
                                        {customer.gender && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                customer.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {customer.gender}
                                            </span>
                                        )}
                                        {customer.age && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                {customer.age} tuổi
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`font-bold ${customer.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {customer.debt.toLocaleString('vi-VN')} ₫
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => handleEdit(customer)} 
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Sửa"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => onRequestDelete(customer)} 
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedCustomers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <User className="h-10 w-10 mb-2 opacity-20" />
                                        <p>Không tìm thấy khách hàng nào.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            {currentCustomers.map(customer => (
            <div key={customer.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    customer.gender === 'Nữ' ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-700'
                }`}>
                    {customer.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                    <button onClick={() => handleEdit(customer)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Sửa">
                    <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => onRequestDelete(customer)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                    <Trash2 className="h-4 w-4" />
                    </button>
                </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{customer.name}</h3>
                
                <div className="space-y-2 text-sm text-slate-600 mt-3">
                {customer.parentsName && (
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <Users className="h-4 w-4" />
                    <span>Bố/Mẹ: {customer.parentsName}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{customer.phone || 'Chưa có SĐT'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{customer.address || 'Chưa có địa chỉ'}</span>
                </div>
                
                {/* Thông tin bổ sung */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                    <User className="h-3 w-3" />
                    <span>{customer.gender || '---'}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                    <Calendar className="h-3 w-3" />
                    <span>
                        {customer.age ? `${customer.age} tuổi` : ''} 
                        {customer.age && customer.monthAge ? ' - ' : ''}
                        {customer.monthAge ? `${customer.monthAge} tháng` : ''}
                        {!customer.age && !customer.monthAge ? '---' : ''}
                    </span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                    <span className="text-[10px] font-bold">KG</span>
                    <span>{customer.weight ? `${customer.weight} kg` : '---'}</span>
                    </div>
                </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-500">Công nợ hiện tại</span>
                <span className={`font-bold ${customer.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {customer.debt.toLocaleString('vi-VN')} ₫
                </span>
                </div>
            </div>
            ))}
            {sortedCustomers.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                    Không tìm thấy khách hàng nào.
                </div>
            )}
        </div>
      )}

      {/* Pagination Controls */}
      {sortedCustomers.length > 0 && (
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
                <span>khách hàng / trang</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                    {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedCustomers.length)} trên {sortedCustomers.length}
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
        <CustomerModal 
          customer={editingCustomer} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(c) => {
            saveCustomer(c);
            setIsModalOpen(false);
          }} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa khách hàng</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-800">"{customerToDelete.name}"</span>?
                <br/>
                <span className="text-sm text-red-500 mt-2 block">Cảnh báo: Toàn bộ lịch sử công nợ và giao dịch của khách hàng này có thể bị mất hoặc lỗi.</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCustomerToDelete(null)}
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

const CustomerModal: React.FC<{
  customer: Customer | null;
  onClose: () => void;
  onSave: (c: Customer) => void;
}> = ({ customer, onClose, onSave }) => {
  // Initialize state with default values if specific fields are missing in the customer object
  const [formData, setFormData] = useState<Partial<Customer>>(() => {
    if (customer) {
      return {
        ...customer,
        gender: customer.gender || 'Nam',
        age: customer.age,
        monthAge: customer.monthAge,
        parentsName: customer.parentsName,
        weight: customer.weight
      };
    }
    return {
      name: '',
      phone: '',
      address: '',
      parentsName: '',
      gender: 'Nam',
      age: undefined,
      monthAge: undefined,
      weight: undefined,
      debt: 0
    };
  });

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: customer?.id || '',
      ...formData as Customer
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {customer ? 'Sửa thông tin khách' : 'Thêm khách mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên khách hàng</label>
              <input 
                required
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Users className="h-4 w-4" /> Thông tin Bố / Mẹ
              </label>
              <input 
                value={formData.parentsName || ''}
                onChange={(e) => handleChange('parentsName', e.target.value)}
                placeholder="VD: Mẹ Lan, Bố Tuấn..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
              <input 
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
              <input 
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
              <select
                value={formData.gender || 'Nam'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi (Năm)</label>
              <input 
                type="number"
                min="0"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
             <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tháng tuổi</label>
              <input 
                type="number"
                min="0"
                value={formData.monthAge || ''}
                onChange={(e) => handleChange('monthAge', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nặng (kg)</label>
              <input 
                type="number"
                min="0"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          
          <div className="pt-6 flex justify-end gap-3 border-t border-slate-50 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-600/20">Lưu thông tin</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;
