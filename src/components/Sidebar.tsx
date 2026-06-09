import React, { useState, useRef, useEffect } from "react";
import { Search, FileSpreadsheet, Layers, Info, Download } from "lucide-react";
import { DatabaseProduct } from "../types";
import { parseImportedFile } from "../utils/fileGenerator";

interface SidebarProps {
  database: DatabaseProduct[];
  setDatabase: (db: DatabaseProduct[]) => void;
  onAddItem: (
    product: DatabaseProduct,
    quantity: number,
    boxNumber: number,
  ) => void;
  onRecoverShipment: (file: File) => Promise<void>;
  lastBoxNumber: number;
}

export default function Sidebar({
  database,
  setDatabase,
  onAddItem,
  onRecoverShipment,
  lastBoxNumber,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<DatabaseProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [boxNumber, setBoxNumber] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [listFilterQuery, setListFilterQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRecoveryRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Sync box number with the last active box for convenience
  useEffect(() => {
    if (lastBoxNumber > 0) {
      setBoxNumber(lastBoxNumber);
    }
  }, [lastBoxNumber]);

  // Handle outside click to close autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownItemsRef.current[highlightedIndex]) {
      dropdownItemsRef.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredProducts.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredProducts.length
        ) {
          const selected = filteredProducts[highlightedIndex];
          setSelectedProduct(selected);
          setSearchQuery(selected.name);
          setShowDropdown(false);
          setError(null);
          setHighlightedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFileImport = async (file: File) => {
    setError(null);
    try {
      const parsedProducts = await parseImportedFile(file);
      setDatabase(parsedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при экспорте базы");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileImport(file);
    }
  };

  const handleFileRecovery = async (file: File) => {
    setRecoveryError(null);
    try {
      await onRecoverShipment(file);
      // Clear recovery error after 2 seconds on success
      setTimeout(() => setRecoveryError(null), 2000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Ошибка при восстановлении";
      setRecoveryError(errorMsg);
      // Keep error visible for 5 seconds
      setTimeout(() => setRecoveryError(null), 5000);
    }
  };

  const handleFileRecoveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRecovery(file);
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

  const handleSelectProduct = (product: DatabaseProduct) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setShowDropdown(false);
    setError(null);
    setHighlightedIndex(-1);
  };

  const handleAdd = () => {
    if (!selectedProduct) {
      setError("Выберите товар из списка подсказок");
      return;
    }
    if (quantity <= 0) {
      setError("Количество должно быть больше 0");
      return;
    }
    if (boxNumber <= 0) {
      setError("Номер коробки должен быть больше 0");
      return;
    }

    onAddItem(selectedProduct, quantity, boxNumber);
    // Reset fields cleanly
    setSearchQuery("");
    setSelectedProduct(null);
    setQuantity(1);
    setError(null);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
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
              ? "border-indigo-500 bg-indigo-50/50"
              : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
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
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="text-center">
            <span className="text-xs font-semibold text-slate-700 block">
              Загрузить базу товаров
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight block mt-0.5">
              Название, баркод, артикул
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
          <span className="font-medium text-slate-500">Загружено товаров:</span>
          <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
            {database.length}
          </span>
        </div>
      </div>

      {/* 1.5 Recovery File Upload Zone */}
      <div
        className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3 transition-all ${database.length === 0 ? "opacity-50" : ""}`}
        id="file-recovery-block"
      >
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500">
          <Download
            className={`w-4 h-4 ${database.length === 0 ? "text-slate-400" : "text-emerald-600"}`}
          />
          <span>Восстановить поставку (XLSX)</span>
        </div>

        {database.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 border-slate-200 bg-slate-50">
            <svg
              className="w-8 h-8 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-500 block">
                Недоступно
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight block mt-0.5">
                Сначала загрузите базу товаров
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRecoveryRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
            id="dropzone-recovery"
          >
            <input
              type="file"
              ref={fileInputRecoveryRef}
              onChange={handleFileRecoveryChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-700 block">
                Загрузить экспортированный файл
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight block mt-0.5">
                Для продолжения заполнения поставки
              </span>
            </div>
          </div>
        )}

        {recoveryError && (
          <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
            ⚠️ {recoveryError}
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-slate-500 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 mt-1">
          <span className="font-medium text-emerald-700">ℹ️ ВАЖНО:</span>
          <span className="text-slate-600 leading-relaxed">
            Загружите БАЗУ товаров перед восстановлением поставки.
          </span>
        </div>
      </div>

      {/* 2. Scrollable Database Catalog Box */}
      <div
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3"
        id="db-catalog-widget"
      >
        <div className="flex items-center justify-between text-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-indigo-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>База («Каталог» товаров)</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
            {database.length} товаров
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
                  onClick={() => setListFilterQuery("")}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-650 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List entries with vertical scrolling */}
            <div
              className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-lg bg-slate-50/30 pr-1 select-none"
              id="db-scroll-list"
            >
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
                        isSelected
                          ? "bg-indigo-50 border-l-[3px] border-indigo-600 pl-1.5"
                          : ""
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
          <label className="text-xs font-semibold text-slate-550">
            Поиск товара по базе
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all placeholder:text-slate-400"
              placeholder="Введите название или баркод... (↑↓ Enter)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedProduct(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              id="product-search-input"
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute top-[68px] z-30 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 divide-y divide-slate-100">
              {filteredProducts.map((p, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={p.id}
                    ref={(el) => {
                      dropdownItemsRef.current[index] = el;
                    }}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left p-2.5 rounded-md flex flex-col gap-0.5 transition-colors ${
                      isHighlighted ? "bg-indigo-100" : "hover:bg-indigo-50/50"
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {p.name}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>Арт: {p.article}</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                        БК: {p.barcode}
                      </span>
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
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Кол-во
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-550"
              value={quantity === 0 ? "" : quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setQuantity(isNaN(val) ? 0 : Math.max(1, val));
              }}
              id="quantity-add-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              № Коробки
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-550"
              value={boxNumber === 0 ? "" : boxNumber}
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Добавить позицию</span>
        </button>
      </div>
    </div>
  );
}
