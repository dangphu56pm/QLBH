import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { getUnits, saveUnit, deleteUnit } from '../services/db';
import { Scale, Plus, Edit2, Trash2, Save, X, Search, AlertTriangle } from 'lucide-react';

const UnitManagement: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Add State
  const [newUnitName, setNewUnitName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Delete State
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  const loadUnits = () => {
    setUnits(getUnits());
  };

  useEffect(() => {
    loadUnits();
    window.addEventListener('unit-change', loadUnits);
    return () => window.removeEventListener('unit-change', loadUnits);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    saveUnit({ id: '', name: newUnitName.trim() });
    setNewUnitName('');
  };

  const startEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setEditName(unit.name);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    saveUnit({ id, name: editName.trim() });
    setEditingId(null);
  };

  const onRequestDelete = (unit: Unit) => {
    setUnitToDelete(unit);
  };

  const confirmDelete = () => {
    if (unitToDelete) {
      deleteUnit(unitToDelete.id);
      setUnitToDelete(null);
    }
  };

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Scale className="h-8 w-8 text-blue-600" /> Quản Lý Đơn Vị Tính
        </h2>
        <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Tìm đơn vị..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
        {/* Header Add New */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
            <form onSubmit={handleAdd} className="flex gap-3">
                <input 
                    type="text" 
                    placeholder="Nhập tên đơn vị mới (VD: Cái, Hộp)..."
                    className="flex-1 p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    required
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus className="h-5 w-5" /> Thêm
                </button>
            </form>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
            {filteredUnits.map((unit, index) => (
              <div key={unit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                 {editingId === unit.id ? (
                  <div className="flex-1 flex gap-3 items-center animate-in fade-in duration-200">
                    <span className="w-8 text-center text-slate-400 font-medium text-sm">#{index + 1}</span>
                    <input 
                      className="flex-1 p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={() => saveEdit(unit.id)} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center gap-1 text-sm font-medium"><Save className="h-4 w-4"/> Lưu</button>
                        <button onClick={() => setEditingId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg flex items-center gap-1 text-sm font-medium"><X className="h-4 w-4"/> Hủy</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {index + 1}
                        </span>
                        <span className="font-medium text-lg text-slate-700">{unit.name}</span>
                    </div>
                    <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(unit)} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Đổi tên"
                      >
                          <Edit2 className="h-5 w-5"/>
                      </button>
                      <button 
                        onClick={() => onRequestDelete(unit)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                          <Trash2 className="h-5 w-5"/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredUnits.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                    <Scale className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Chưa có đơn vị tính nào</p>
                </div>
            )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {unitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa đơn vị</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa đơn vị <span className="font-bold text-slate-800">"{unitToDelete.name}"</span>?
                <br/>
                <span className="text-sm text-red-500 mt-2 block">Lưu ý: Các sản phẩm đang dùng đơn vị này sẽ giữ nguyên tên đơn vị cũ (dạng văn bản).</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setUnitToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-200"
                >
                  Xóa đơn vị
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitManagement;