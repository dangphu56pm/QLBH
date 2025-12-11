import React, { useState, useEffect } from 'react';
import { ViewState, MenuConfigItem } from '../types';
import { getMenuConfig, saveMenuConfig } from '../services/db';
import { ArrowUp, ArrowDown, Save, RotateCcw, Layout, Eye, EyeOff } from 'lucide-react';

const VIEW_LABELS: Record<string, string> = {
  [ViewState.DASHBOARD]: 'Tổng quan',
  [ViewState.SALES]: 'Bán hàng',
  [ViewState.REPORTS]: 'Báo cáo doanh thu',
  [ViewState.INVENTORY]: 'Kho hàng (Sản phẩm)',
  [ViewState.CATEGORIES]: 'Quản lý danh mục',
  [ViewState.UNITS]: 'Quản lý đơn vị tính',
  [ViewState.IMPORT_STOCK]: 'Nhập kho',
  [ViewState.EXPORT_STOCK]: 'Xuất kho',
  [ViewState.CUSTOMERS]: 'Khách hàng',
  [ViewState.DEBT]: 'Công nợ',
  [ViewState.DATA_SYNC]: 'Dữ liệu & Đồng bộ',
  [ViewState.USERS]: 'Nhân viên',
};

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuConfigItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setMenuItems(getMenuConfig());
  }, []);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...menuItems];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setMenuItems(newItems);
    setHasChanges(true);
  };

  const toggleVisibility = (index: number) => {
    const newItems = [...menuItems];
    newItems[index].isVisible = !newItems[index].isVisible;
    setMenuItems(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMenuConfig(menuItems);
    setHasChanges(false);
    alert('Đã lưu cấu hình menu thành công!');
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc muốn đặt lại menu về mặc định?')) {
      localStorage.removeItem('app_menu_config');
      setMenuItems(getMenuConfig());
      setHasChanges(false);
      window.dispatchEvent(new Event('menu-config-change'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layout className="h-8 w-8 text-blue-600" /> Quản Lý Menu
        </h2>
        <div className="flex gap-2">
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
                <RotateCcw className="h-4 w-4" /> Đặt lại
            </button>
            <button 
                onClick={handleSave}
                disabled={!hasChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    hasChanges 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
                <Save className="h-4 w-4" /> Lưu thay đổi
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl">
          <div className="p-4 bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
              Sắp xếp thứ tự hiển thị trên thanh điều hướng bên trái.
          </div>
          <div className="divide-y divide-slate-100">
              {menuItems.map((item, index) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                              {index + 1}
                          </span>
                          <div>
                              <p className={`font-medium ${item.isVisible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                  {VIEW_LABELS[item.id] || item.id}
                              </p>
                              <p className="text-xs text-slate-400">{item.id}</p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button
                              onClick={() => toggleVisibility(index)}
                              className={`p-2 rounded-lg transition-colors ${
                                  item.isVisible 
                                  ? 'text-blue-600 hover:bg-blue-50' 
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={item.isVisible ? "Đang hiện" : "Đang ẩn"}
                          >
                              {item.isVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                          </button>
                          
                          <div className="w-px h-6 bg-slate-200 mx-2"></div>

                          <button 
                              onClick={() => moveItem(index, 'up')}
                              disabled={index === 0}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <ArrowUp className="h-5 w-5" />
                          </button>
                          <button 
                              onClick={() => moveItem(index, 'down')}
                              disabled={index === menuItems.length - 1}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <ArrowDown className="h-5 w-5" />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 border border-blue-100">
        <p className="font-bold mb-1">Lưu ý:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Các mục bị ẩn sẽ không hiển thị trên thanh bên trái.</li>
            <li>Admin vẫn có thể truy cập tất cả các mục (trừ khi bị ẩn hoàn toàn trong code).</li>
            <li>Nhân viên (Staff) chỉ thấy các mục không được đánh dấu là "Protected" trong code.</li>
            <li>Thứ tự sắp xếp ở đây sẽ quyết định thứ tự hiển thị trên menu.</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuManagement;