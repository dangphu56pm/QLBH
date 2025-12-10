import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/db';
import { Plus, Edit2, Trash2, UserCog, Shield, ShieldAlert, Key, AlertTriangle } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Delete State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  useEffect(() => {
    loadUsers();
    window.addEventListener('user-change', loadUsers);
    return () => window.removeEventListener('user-change', loadUsers);
  }, []);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const onRequestDelete = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="h-8 w-8 text-blue-600" /> Quản Lý Người Dùng
        </h2>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4">Họ và Tên</th>
              <th className="px-6 py-4">Tên đăng nhập</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                <td className="px-6 py-4 text-slate-600">{user.username}</td>
                <td className="px-6 py-4">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <ShieldAlert className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <Shield className="h-3 w-3" /> Staff
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => onRequestDelete(user)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(u) => {
            saveUser(u);
            setIsModalOpen(false);
          }} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa người dùng</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa tài khoản <span className="font-bold text-slate-800">"{userToDelete.username}"</span>?
                <br/>
                <span className="text-sm text-red-500 mt-2 block">Người dùng này sẽ không thể đăng nhập vào hệ thống nữa.</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-200"
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserModal: React.FC<{
  user: User | null;
  onClose: () => void;
  onSave: (u: User) => void;
}> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      username: '',
      password: '',
      name: '',
      role: 'staff'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: user?.id || '',
      ...formData as User
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {user ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
            <input 
              required
              disabled={!!user} // Không cho sửa username khi edit
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${user ? 'bg-slate-100 text-slate-500' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {user ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}
            </label>
            <div className="relative">
                <Key className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                type="password"
                required={!user}
                value={formData.password || ''}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
            <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
                <option value="staff">Nhân viên</option>
                <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;