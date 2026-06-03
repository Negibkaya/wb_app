import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainDisplay from './components/MainDisplay';
import { DEFAULT_DATABASE_PRODUCTS } from './data';
import { DatabaseProduct, ShipmentItem } from './types';
import { exportToXLSX, exportToPDF } from './utils/fileGenerator';
import { 
  FileSpreadsheet, 
  HelpCircle, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle2, 
  Info,
  Layers,
  Scale
} from 'lucide-react';

export default function App() {
  const [database, setDatabase] = useState<DatabaseProduct[]>(() => {
    const saved = localStorage.getItem('wb_database');
    return saved ? JSON.parse(saved) : [];
  });

  const [items, setItems] = useState<ShipmentItem[]>(() => {
    const saved = localStorage.getItem('wb_shipment_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastBoxNumber, setLastBoxNumber] = useState<number>(() => {
    const saved = localStorage.getItem('wb_last_box_number');
    return saved ? parseInt(saved) : 1;
  });

  const [showGuide, setShowGuide] = useState(true);
  const [confirmResetDb, setConfirmResetDb] = useState(false);
  const [confirmClearShipment, setConfirmClearShipment] = useState(false);

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem('wb_database', JSON.stringify(database));
  }, [database]);

  useEffect(() => {
    localStorage.setItem('wb_shipment_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('wb_last_box_number', String(lastBoxNumber));
  }, [lastBoxNumber]);

  // Handle adding shipping positions (chronologically)
  const handleAddItem = (product: DatabaseProduct, quantity: number, boxNumber: number) => {
    // Generate simple ID
    const newItem: ShipmentItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product,
      quantity,
      boxNumber,
      createdAt: Date.now(),
    };

    setItems((prev) => [...prev, newItem]);
    setLastBoxNumber(boxNumber);
  };

  // Handle inline quantities edits
  const handleUpdateQty = (itemId: string, newQty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item))
    );
  };

  // Handle inline cargo box edits
  const handleUpdateBoxNum = (itemId: string, newBoxNum: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, boxNumber: newBoxNum } : item))
    );
    if (newBoxNum > 0) {
      setLastBoxNumber(newBoxNum);
    }
  };

  // Replace item product completely
  const handleReplaceProduct = (itemId: string, newProduct: DatabaseProduct) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, product: newProduct } : item))
    );
  };

  // Delete cargo item position
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Clear loaded products database
  const handleResetDatabase = () => {
    if (!confirmResetDb) {
      setConfirmResetDb(true);
      setTimeout(() => setConfirmResetDb(false), 3500);
      return;
    }
    setDatabase([]);
    setConfirmResetDb(false);
  };

  // Clear current shipment list
  const handleClearShipment = () => {
    if (items.length === 0) return;
    if (!confirmClearShipment) {
      setConfirmClearShipment(true);
      setTimeout(() => setConfirmClearShipment(false), 3500);
      return;
    }
    setItems([]);
    setLastBoxNumber(1);
    setConfirmClearShipment(false);
  };

  // Export actions
  const triggerExportXLSX = () => {
    exportToXLSX(items, `Поставка_WB_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const triggerExportPDF = async () => {
    await exportToPDF(items, `Поставка_WB_${new Date().toISOString().slice(0, 10)}`);
  };

  // Stats calculation
  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalBoxesCount = new Set(items.map((i) => i.boxNumber)).size;
  const uniqueBarcodes = new Set(items.map((i) => i.product.barcode)).size;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-700" id="app-root">
      {/* Dynamic Header with download files actions */}
      <Header 
        onDownloadXLSX={triggerExportXLSX} 
        onDownloadPDF={triggerExportPDF} 
        itemsCount={items.length} 
      />

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col gap-5" id="app-main-layout">
        
        {/* Statistics Board with elegant numbers */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-ribbon">
            {/* Stat Box 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-indigo-55 text-indigo-700 flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">АКТИВНЫХ КОРОБОК</span>
                <span className="text-lg font-extrabold text-slate-900 leading-tight">{totalBoxesCount} шт.</span>
              </div>
            </div>

            {/* Stat Box 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg">
                🛍️
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">ОБЩЕЕ ЧИСЛО ТОВАРОВ</span>
                <span className="text-lg font-extrabold text-slate-900 leading-tight">{totalItemsCount} шт.</span>
              </div>
            </div>

            {/* Stat Box 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                🏷️
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">УНИКАЛЬНЫХ БАРКОДОВ</span>
                <span className="text-lg font-extrabold text-slate-900 leading-tight">{uniqueBarcodes} шт.</span>
              </div>
            </div>
          </div>
        )}

        {/* Action controls / Reset & Help Ribbon */}
        {showGuide && (
          <div className="bg-indigo-900 rounded-xl p-5 text-white shadow-sm relative overflow-hidden" id="tip-card">
            <div className="absolute right-0 bottom-0 opacity-10 leading-none select-none text-[150px] font-sans font-black pointer-events-none">
              WB
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 shrink-0 text-indigo-200 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Инструкция перед импортом Excel / CSV</h3>
                  <p className="text-xs text-indigo-150 mt-1.5 leading-relaxed max-w-3xl">
                    Для загрузки своей базы товаров используйте файл Excel или CSV. 
                    Файл должен иметь <strong>3 колонки с заголовками в любой строчке:</strong> 
                    <span className="bg-white/10 font-mono px-1.5 py-0.5 rounded text-white ml-1">Название</span>, 
                    <span className="bg-white/10 font-mono px-1.5 py-0.5 rounded text-white ml-2">Баркод</span>, и 
                    <span className="bg-white/10 font-mono px-1.5 py-0.5 rounded text-white ml-2">Артикул</span>. 
                    Если у вас нет готового файла под рукой, конструктор уже заполнен демо-товарами.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-xs font-bold text-indigo-900 bg-white hover:bg-slate-50 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto shadow-2xs"
              >
                Понятно, скрыть
              </button>
            </div>
          </div>
        )}

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="app-workspace-grid">
          {/* Left Column (Sidebar controls, uploads, autocomplete form) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <Sidebar 
              database={database}
              setDatabase={setDatabase}
              onAddItem={handleAddItem}
              lastBoxNumber={lastBoxNumber}
            />

            {/* Quick database operations widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Сброс состояния и очистка</span>
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                <button
                  onClick={handleResetDatabase}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    confirmResetDb
                      ? 'border-amber-300 bg-amber-50 text-amber-700 animate-pulse font-bold scale-[1.02]'
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Очистить загруженную базу товаров"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${confirmResetDb ? 'animate-spin text-amber-600' : 'text-slate-400'}`} />
                  <span>{confirmResetDb ? 'Точно очистить?' : 'Очистить базу'}</span>
                </button>

                <button
                  onClick={handleClearShipment}
                  disabled={items.length === 0}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    items.length === 0
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : confirmClearShipment
                      ? 'border-red-300 bg-red-50 text-red-700 animate-pulse font-bold scale-[1.02]'
                      : 'border-red-100 hover:border-red-200 text-red-700 hover:bg-red-50/55'
                  }`}
                  title="Удалить все позиции товаров из коробок"
                >
                  <svg className={`w-3.5 h-3.5 ${confirmClearShipment ? 'animate-bounce text-red-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>{confirmClearShipment ? 'Точно очистить?' : 'Очистить коробки'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Dynamic Tab cargo visual list) */}
          <div className="lg:col-span-8">
            <MainDisplay 
              items={items}
              database={database}
              onUpdateQty={handleUpdateQty}
              onUpdateBoxNum={handleUpdateBoxNum}
              onReplaceProduct={handleReplaceProduct}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        </div>
      </main>

      {/* Footer copyright with professional attribution */}
      <footer className="border-t border-slate-200 bg-white py-5 px-6 shrink-0 mt-12 text-center" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-slate-400">
          <span>
            Конструктор распределения коробок для поставок Wildberries © {new Date().getFullYear()}
          </span>
          <span className="font-medium">
            Формирование XLSX упаковочных листов и PDF описи грузов по коробам
          </span>
        </div>
      </footer>
    </div>
  );
}
