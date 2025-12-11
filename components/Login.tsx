
import React, { useState, useEffect } from 'react';
import { login, getSyncConfig } from '../services/db';
import { User } from '../types';
import { Lock, User as UserIcon, LogIn } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [branding, setBranding] = useState({ name: 'Sales Manager', logo: '' });

  useEffect(() => {
      const config = getSyncConfig();
      setBranding({ 
          name: config.shopName || 'Hệ Thống Bán Hàng', 
          logo: config.shopLogo || '' 
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-24 h-24 object-contain mb-4 rounded-xl" />
          ) : (
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white shadow-lg shadow-blue-300">
                <Lock className="h-8 w-8" />
              </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800">{branding.name}</h1>
          <p className="text-slate-500 mt-2">Vui lòng đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ví dụ: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30"
          >
            <LogIn className="h-5 w-5" /> Đăng Nhập
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Tài khoản mặc định:</p>
          <p>Admin: admin / 123</p>
          <p>Staff: staff / 123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
