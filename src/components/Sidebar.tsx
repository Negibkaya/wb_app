import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Plus, Search, FileSpreadsheet, Layers, Info } from 'lucide-react';
import { DatabaseProduct } from '../types';
import { parseImportedFile } from '../utils/fileGenerator';

interface SidebarProps {
  database: DatabaseProduct[];
  setDatabase: (db: DatabaseProduct[]) => void;
  onAddItem: (product: DatabaseProduct, quantity: number, boxNumber: number) => void;
  lastBoxNumber: number;
}

export default function Sidebar({ database, setDatabase, onAddItem, lastBoxNumber }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<DatabaseProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [boxNumber, setBoxNumber] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [listFilterQuery, setListFilterQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync box number with the last active box for convenience
  useEffect(() => {
    if (lastBoxNumber > 0) {
      setBoxNumber(lastBoxNumber);
    }
  }, [lastBoxNumber]);

  // Handle outside click to close autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on typing
  const filteredProducts = searchQuery
    ? database.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.article.toLowerCase().includes(query)
        );
      })
    : [];

  const handleFileImport = async (file: File) => {
    setError(null);
    try {
      const parsedProducts = await parseImportedFile(file);
      setDatabase(parsedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при экспорте базы');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileImport(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileImport(file);
    }
  };

  const handleAdd = () => {
    if (!selectedProduct) {
      setError('Выберите товар из списка подсказок');
      return;
    }
    if (quantity <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }
    if (boxNumber <= 0) {
      setError('Номер коробки должен быть больше 0');
      return;
    }

    onAddItem(selectedProduct, quantity, boxNumber);
    // Reset fields cleanly
    setSearchQuery('');
    setSelectedProduct(null);
    setQuantity(1);
    setError(null);
  };

  return (
    <div className="w-full flex flex-col gap-5" id="sidebar-container">
      {/* 1. Database File Upload Zone */}
      <div 
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3 transition-all"
        id="file-upload-block"
      >
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500">
          <FileSpreadsheet className="w-4 h-4 text-indigo-650" />
          <span>База товаров (CSV/XLSX)</span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50/50' 
              : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
          }`}
          id="dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-center">
            <span className="text-xs font-semibold text-slate-700 block">Загрузить базу товаров</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight block mt-0.5">Название, баркод, артикул</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
          <span className="font-medium text-slate-500">Загружено товаров:</span>
          <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">{database.length}</span>
        </div>
      </div>

      {/* 2. Scrollable Database Catalog Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3" id="db-catalog-widget">
        <div className="flex items-center justify-between text-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            <span>База («Каталог» товаров)</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
            {database.length} SKU
          </span>
        </div>

        {database.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-medium bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            База пуста. Загрузите файл Excel/CSV выше.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Catalog quick filter mini Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded px-8 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                placeholder="Быстрый фильтр по названию или БК..."
                value={listFilterQuery}
                onChange={(e) => setListFilterQuery(e.target.value)}
                id="catalog-quick-filter-input"
              />
              {listFilterQuery && (
                <button
                  type="button"
                  onClick={() => setListFilterQuery('')}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-650 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List entries with vertical scrolling */}
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-lg bg-slate-50/30 pr-1 select-none" id="db-scroll-list">
              {database
                .filter((p) => {
                  const q = listFilterQuery.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.barcode.toLowerCase().includes(q) ||
                    p.article.toLowerCase().includes(q)
                  );
                })
                .map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchQuery(product.name);
                        setShowDropdown(false);
                        setError(null);
                      }}
                      className={`w-full text-left p-2 hover:bg-indigo-50/70 block transition-all relative ${
                        isSelected ? 'bg-indigo-50 border-l-[3px] border-indigo-600 pl-1.5' : ''
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1 block leading-tight">
                        {product.name}
                      </span>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 font-medium mt-1">
                        <span>Арт: {product.article}</span>
                        <span className="bg-slate-100 text-slate-600 px-1 py-0.1 select-text rounded scale-95 origin-right">
                          {product.barcode}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
            
            <span className="text-[10px] text-slate-400 italic font-medium tracking-tight block text-center">
              💡 Нажмите на товар, чтобы выбрать его для добавления
            </span>
          </div>
        )}
      </div>

      {/* 3. Adding to shipment forms */}
      <div 
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4"
        id="add-item-form"
      >
        <div className="flex items-center justify-between text-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-650" />
            <span>Добавить в поставку</span>
          </div>
        </div>

        {/* Autocomplete Input */}
        <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
          <label className="text-xs font-semibold text-slate-550">Поиск товара по базе</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all placeholder:text-slate-400"
              placeholder="Введите название или баркод..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedProduct(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              id="product-search-input"
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute top-[68px] z-30 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                // Highlight part matching search query is a great user touch!
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setSearchQuery(p.name);
                      setShowDropdown(false);
                      setError(null);
                    }}
                    className="w-full text-left p-2.5 hover:bg-indigo-50/50 rounded-md flex flex-col gap-0.5 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">{p.name}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>Арт: {p.article}</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">БК: {p.barcode}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* User state details once product is fully chosen */}
          {selectedProduct && (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 flex flex-col gap-1 mt-1">
              <div className="text-[11px] font-bold text-indigo-900 line-clamp-2">
                Выбран: {selectedProduct.name}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-indigo-700 font-medium">
                <span>Артикул: {selectedProduct.article}</span>
                <span>Баркод: {selectedProduct.barcode}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quantity and Box Number Selection Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Кол-во</label>
            <input
              type="number"
              min="1"
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-550"
              value={quantity === 0 ? '' : quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setQuantity(isNaN(val) ? 0 : Math.max(1, val));
              }}
              id="quantity-add-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">№ Коробки</label>
            <input
              type="number"
              min="1"
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-550"
              value={boxNumber === 0 ? '' : boxNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setBoxNumber(isNaN(val) ? 0 : Math.max(1, val));
              }}
              id="box-number-add-input"
            />
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button closely aligned with template bg-indigo-600/bg-indigo-700 */}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
          id="btn-add-shipment"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          <span>Добавить позицию</span>
        </button>
      </div>
    </div>
  );
}
