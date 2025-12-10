import React, { useState, useEffect } from 'react';
import { exportDatabase, importDatabase, getSyncConfig, saveSyncConfig } from '../services/db';
import { Download, Upload, Database, CheckCircle, AlertCircle, RefreshCw, FileJson, Clock, Settings, ToggleLeft, ToggleRight, Save, HardDrive, AlertTriangle, Calendar, Palette, Check } from 'lucide-react';
import { SyncConfig } from '../types';

const THEME_OPTIONS = [
  { id: 'blue', name: 'Xanh Dương', color: '#2563eb' },
  { id: 'emerald', name: 'Xanh Lá', color: '#10b981' },
  { id: 'violet', name: 'Tím', color: '#8b5cf6' },
  { id: 'amber', name: 'Vàng Cam', color: '#f59e0b' },
  { id: 'rose', name: 'Đỏ Hồng', color: '#f43f5e' },
  { id: 'cyan', name: 'Xanh Ngọc', color: '#06b6d4' },
];

const DataSync: React.FC = () => {
  const [importStatus, setImportStatus] = useState<{success: boolean, message: string} | null>(null);
  const [lastBackup, setLastBackup] = useState<string>('');
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  
  // Settings State
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
      autoBackup: false,
      intervalMinutes: 60,
      lastBackup: '',
      expiryAlertDays: 30,
      themeColor: 'blue'
  });

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingInterval, setPendingInterval] = useState<number>(60);

  useEffect(() => {
    const config = getSyncConfig();
    setSyncConfig(config);
    setLastBackup(config.lastBackup ? new Date(config.lastBackup).toLocaleString('vi-VN') : 'Chưa có');

    // Check persistence status
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, []);

  const handleExport = () => {
    const jsonString = exportDatabase();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `backup_qlbh_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const now = new Date().toISOString();
    setLastBackup(new Date(now).toLocaleString('vi-VN'));
    
    // Update config with new last backup time
    const newConfig = { ...syncConfig, lastBackup: now };
    setSyncConfig(newConfig);
    saveSyncConfig(newConfig);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importDatabase(content);
      setImportStatus(result);
      
      if (result.success) {
        setTimeout(() => {
             window.location.reload(); // Reload to refresh all states
        }, 1500);
      }
    };
    reader.readAsText(file);
  };

  const handleConfigChange = (key: keyof SyncConfig, value: any) => {
      const newConfig = { ...syncConfig, [key]: value };
      setSyncConfig(newConfig);
      saveSyncConfig(newConfig);
  };

  const initiateIntervalChange = (newValue: number) => {
    setPendingInterval(newValue);
    setShowConfirmModal(true);
  };

  const confirmIntervalChange = () => {
    handleConfigChange('intervalMinutes', pendingInterval);
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Database className="h-8 w-8 text-blue-600" /> Quản Lý & Đồng Bộ Dữ Liệu
      </h2>

      {/* Configuration Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                <Settings className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Cấu hình Hệ thống</h3>
                <p className="text-sm text-slate-500">Cài đặt giao diện, sao lưu và cảnh báo.</p>
            </div>
        </div>
        
        <div className="space-y-6">
            
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

            {/* Auto Backup Setting */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">Tự động sao lưu:</span>
                        <button 
                            onClick={() => handleConfigChange('autoBackup', !syncConfig.autoBackup)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium ${
                                syncConfig.autoBackup 
                                ? 'bg-green-100 text-green-700 shadow-sm' 
                                : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                            {syncConfig.autoBackup ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                            {syncConfig.autoBackup ? 'Đang Bật' : 'Đang Tắt'}
                        </button>
                    </div>

                    {syncConfig.autoBackup && (
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-left-2 shadow-sm">
                            <span className="font-bold text-blue-700 text-sm whitespace-nowrap">Tần suất:</span>
                            <select 
                                value={syncConfig.intervalMinutes}
                                onChange={(e) => initiateIntervalChange(parseInt(e.target.value))}
                                className="bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <option value={15}>Mỗi 15 phút</option>
                                <option value={30}>Mỗi 30 phút</option>
                                <option value={60}>Mỗi 1 giờ</option>
                                <option value={240}>Mỗi 4 giờ</option>
                                <option value={1440}>Hàng ngày (24h)</option>
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="text-sm text-slate-500 flex items-center gap-1 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                     <RefreshCw className="h-4 w-4 text-slate-400" />
                     <span>Lần sao lưu cuối: <span className="font-medium text-slate-700">{lastBackup}</span></span>
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
                    (Sản phẩm có hạn sử dụng còn lại ít hơn số ngày này sẽ được tô đỏ)
                </p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <Download className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Kết xuất dữ liệu (Thủ công)</h3>
                    <p className="text-sm text-slate-500">Tải toàn bộ dữ liệu hiện tại về máy.</p>
                </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-slate-600 border border-slate-100">
                <p className="mb-2 font-medium">Dữ liệu bao gồm:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-slate-500">
                    <li>Danh sách sản phẩm & tồn kho</li>
                    <li>Danh sách khách hàng & công nợ</li>
                    <li>Lịch sử đơn hàng, nhập/xuất kho</li>
                    <li>Cấu hình nhân viên & hệ thống</li>
                </ul>
            </div>

            <button 
                onClick={handleExport}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200 active:scale-[0.98]"
            >
                <FileJson className="h-5 w-5" /> Tải về file backup (.json)
            </button>
            
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                    <Upload className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Khôi phục dữ liệu</h3>
                    <p className="text-sm text-slate-500">Nhập dữ liệu từ file backup đã có.</p>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-slate-600 border border-slate-100">
                <p className="font-bold text-orange-600 flex items-center gap-1 mb-2">
                    <AlertCircle className="h-4 w-4" /> Cảnh báo:
                </p>
                <p>Hành động này sẽ <b>ghi đè toàn bộ dữ liệu hiện tại</b> bằng dữ liệu trong file. Dữ liệu hiện tại sẽ bị mất nếu chưa được sao lưu.</p>
            </div>

            <div className="relative">
                <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImport}
                    className="hidden" 
                    id="file-upload"
                />
                <label 
                    htmlFor="file-upload"
                    className="w-full py-3 bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
                >
                    <Upload className="h-5 w-5" /> Chọn file để khôi phục
                </label>
            </div>

            {importStatus && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${importStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {importStatus.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {importStatus.message}
                    {importStatus.success && <span className="ml-auto text-xs opacity-75 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Đang tải lại...</span>}
                </div>
            )}
        </div>

        {/* Sync Info */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-lg">
             <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-blue-400" /> Trạng thái lưu trữ hệ thống
                    </h3>
                    <p className="text-slate-300 text-sm mb-4 max-w-2xl">
                        Dữ liệu được lưu trữ cục bộ trên trình duyệt này. Để đồng bộ dữ liệu sang thiết bị khác hoặc tránh mất mát dữ liệu, vui lòng bật <b>Tự động sao lưu</b> hoặc thực hiện kết xuất dữ liệu định kỳ.
                    </p>
                 </div>
                 {isPersisted && (
                     <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                         <CheckCircle className="h-3 w-3" /> Protected
                     </div>
                 )}
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 bg-slate-800/50 p-4 rounded-lg">
                 <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${isPersisted ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                     <span>Chế độ: <b className="text-white">{isPersisted ? 'Vĩnh viễn (Persistent)' : 'Tiêu chuẩn (Standard)'}</b></span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Database className="h-3 w-3" />
                     <span>Dung lượng sử dụng: <b className="text-white">~{(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</b></span>
                 </div>
             </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Thay đổi tần suất sao lưu?</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn thay đổi tần suất sao lưu tự động thành 
                <span className="font-bold text-slate-800"> {pendingInterval < 60 ? `${pendingInterval} phút` : `${pendingInterval/60} giờ`}</span>?
                <br/>
                <span className="text-xs text-yellow-600 mt-2 block">Việc thay đổi sẽ có hiệu lực ngay lập tức.</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmIntervalChange}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSync;