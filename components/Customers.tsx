import React, { useState } from 'react';
import { Customer } from '../types';
import { saveCustomer, deleteCustomer } from '../services/db';
import { Plus, Search, Edit2, Phone, MapPin, User, Calendar, Database, Trash2, AlertTriangle } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
}

const Customers: React.FC<CustomersProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // State for Delete Modal
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Khách Hàng</h2>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc SĐT..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm khách</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
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
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{customer.phone || 'Chưa có SĐT'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="truncate">{customer.address || 'Chưa có địa chỉ'}</span>
              </div>
              
              {/* Thông tin bổ sung */}
              <div className="flex items-center gap-4 pt-2 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                  <User className="h-3 w-3" />
                  <span>{customer.gender || '---'}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                  <Calendar className="h-3 w-3" />
                  <span>{customer.age ? `${customer.age} tuổi` : '---'}</span>
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
        {filteredCustomers.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            Không tìm thấy khách hàng nào.
          </div>
        )}
      </div>

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
        weight: customer.weight
      };
    }
    return {
      name: '',
      phone: '',
      address: '',
      gender: 'Nam',
      age: undefined,
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
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
              <input 
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
              <input 
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi</label>
              <input 
                type="number"
                min="0"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cân nặng (kg)</label>
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