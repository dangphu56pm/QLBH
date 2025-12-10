import React, { useState, useEffect } from 'react';
import { exportDatabase, importDatabase, getSyncConfig, saveSyncConfig } from '../services/db';
import { Download, Upload, Database, CheckCircle, AlertCircle, RefreshCw, FileJson, Clock, Settings, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { SyncConfig } from '../types';

const DataSync: React.FC = () => {
  const [importStatus, setImportStatus] = useState<{success: boolean, message: string} | null>(null);
  const [lastBackup, setLastBackup] = useState<string>('');
  
  // Settings State
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
      autoBackup: false,
      intervalMinutes: 60,
      lastBackup: ''
  });

  useEffect(() => {
    const config = getSyncConfig();
    setSyncConfig(config);
    setLastBackup(config.lastBackup ? new Date(config.lastBackup).toLocaleString('vi-VN') : 'Chưa có');
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Database className="h-8 w-8 text-blue-600" /> Quản Lý & Đồng Bộ Dữ Liệu
      </h2>

      {/* Auto Backup Configuration Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                <Clock className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Cấu hình Tự động Sao lưu</h3>
                <p className="text-sm text-slate-500">Hệ thống sẽ tự động tải file sao lưu về máy theo định kỳ.</p>
            </div>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">Trạng thái:</span>
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
                        <span className="font-bold text-blue-700 text-sm whitespace-nowrap">Tần suất sao lưu:</span>
                        <select 
                            value={syncConfig.intervalMinutes}
                            onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value))}
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
             <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-400" /> Đồng bộ dữ liệu theo thời gian
             </h3>
             <p className="text-slate-300 text-sm mb-4">
                 Dữ liệu được lưu trữ cục bộ trên trình duyệt này. Để đồng bộ dữ liệu sang thiết bị khác hoặc tránh mất mát dữ liệu, vui lòng bật <b>Tự động sao lưu</b> hoặc thực hiện kết xuất dữ liệu định kỳ.
             </p>
             <div className="flex items-center gap-4 text-xs text-slate-400">
                 <div className="flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-500"></span> Trạng thái: Hoạt động
                 </div>
                 <div>
                     Dung lượng lưu trữ: ~{(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default DataSync;