
import React, { useState, useEffect } from 'react';
import { getSyncConfig, saveSyncConfig } from '../services/db';
import { Palette, Check, Calendar, Sliders, Store, Upload, Trash2, Image } from 'lucide-react';
import { SyncConfig } from '../types';

const THEME_OPTIONS = [
  { id: 'blue', name: 'Xanh Dương', color: '#2563eb' },
  { id: 'emerald', name: 'Xanh Lá', color: '#10b981' },
  { id: 'violet', name: 'Tím', color: '#8b5cf6' },
  { id: 'amber', name: 'Vàng Cam', color: '#f59e0b' },
  { id: 'rose', name: 'Đỏ Hồng', color: '#f43f5e' },
  { id: 'cyan', name: 'Xanh Ngọc', color: '#06b6d4' },
];

const SystemConfig: React.FC = () => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
      autoBackup: false,
      intervalMinutes: 60,
      lastBackup: '',
      expiryAlertDays: 30,
      themeColor: 'blue',
      shopName: 'Quản Lý Bán Hàng',
      shopLogo: ''
  });

  useEffect(() => {
    setSyncConfig(getSyncConfig());
  }, []);

  const handleConfigChange = (key: keyof SyncConfig, value: any) => {
      const newConfig = { ...syncConfig, [key]: value };
      setSyncConfig(newConfig);
      saveSyncConfig(newConfig);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size (e.g., 1MB)
    if (file.size > 1024 * 1024) {
        alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 1MB.');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        handleConfigChange('shopLogo', reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="h-8 w-8 text-blue-600" /> Cài đặt chung
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="space-y-6">
                
                {/* Branding Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Store className="h-4 w-4" /> Thông tin cửa hàng
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tên cửa hàng</label>
                            <input 
                                type="text"
                                value={syncConfig.shopName}
                                onChange={(e) => handleConfigChange('shopName', e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Nhập tên cửa hàng..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Logo hệ thống</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                                    {syncConfig.shopLogo ? (
                                        <img src={syncConfig.shopLogo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Image className="h-8 w-8 text-slate-300" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden" 
                                            id="logo-upload"
                                            onChange={handleLogoUpload}
                                        />
                                        <label 
                                            htmlFor="logo-upload"
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                                        >
                                            <Upload className="h-4 w-4" /> Tải ảnh lên
                                        </label>
                                    </div>
                                    {syncConfig.shopLogo && (
                                        <button 
                                            onClick={() => handleConfigChange('shopLogo', '')}
                                            className="flex items-center gap-2 px-3 py-1.5 text-red-600 text-sm hover:underline"
                                        >
                                            <Trash2 className="h-4 w-4" /> Xóa logo
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Định dạng: PNG, JPG (Max 1MB)</p>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Theme Selector */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Palette className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-slate-700">Màu sắc chủ đạo:</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {THEME_OPTIONS.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => handleConfigChange('themeColor', theme.id)}
                                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                                    syncConfig.themeColor === theme.id ? 'ring-2 ring-offset-2 ring-blue-400' : ''
                                }`}
                                style={{ backgroundColor: theme.color }}
                                title={theme.name}
                            >
                                {syncConfig.themeColor === theme.id && (
                                    <Check className="h-5 w-5 text-white" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Expiry Alert Setting */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        <span className="font-medium text-slate-700">Cảnh báo hết hạn trước:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            min="1"
                            max="365"
                            value={syncConfig.expiryAlertDays || 30}
                            onChange={(e) => handleConfigChange('expiryAlertDays', parseInt(e.target.value))}
                            className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold"
                        />
                        <span className="text-slate-600">ngày</span>
                    </div>
                    <p className="text-xs text-slate-400 italic flex-1">
                        (Sản phẩm có hạn sử dụng còn lại ít hơn số ngày này sẽ được tô đỏ trong kho hàng và Dashboard)
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SystemConfig;
