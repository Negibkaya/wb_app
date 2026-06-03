import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit3, ArrowRightLeft, CreditCard, Search, X, Package, Box } from 'lucide-react';
import { DatabaseProduct, ShipmentItem } from '../types';

interface MainDisplayProps {
  items: ShipmentItem[];
  database: DatabaseProduct[];
  onUpdateQty: (itemId: string, newQty: number) => void;
  onUpdateBoxNum: (itemId: string, newBoxNum: number) => void;
  onReplaceProduct: (itemId: string, newProduct: DatabaseProduct) => void;
  onRemoveItem: (itemId: string) => void;
}

export default function MainDisplay({
  items,
  database,
  onUpdateQty,
  onUpdateBoxNum,
  onReplaceProduct,
  onRemoveItem,
}: MainDisplayProps) {
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');

  // Extract unique sorted box numbers represented in the current shipment items
  const boxNumbers = Array.from(new Set(items.map((item) => item.boxNumber))).sort((a, b) => a - b);

  // If activeTab is a box number that no longer exists, revert to 'all'
  if (activeTab !== 'all' && !boxNumbers.includes(activeTab)) {
    setActiveTab('all');
  }

  // Filter items by tab selection
  const displayedItems = activeTab === 'all' 
    ? items 
    : items.filter((item) => item.boxNumber === activeTab);

  // Filter products in database for replacing product search
  const filteredDatabase = replaceSearchQuery
    ? database.filter((p) => {
        const query = replaceSearchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.article.toLowerCase().includes(query)
        );
      })
    : database.slice(0, 5); // Default to first 5 products for recommendations

  const handleProductReplacement = (itemId: string, product: DatabaseProduct) => {
    onReplaceProduct(itemId, product);
    setReplacingItemId(null);
    setReplaceSearchQuery('');
  };

  // Stats inside active tab
  const totalQtyInTab = displayedItems.reduce((acc, current) => acc + current.quantity, 0);
  const uniqueSKUsInTab = new Set(displayedItems.map((item) => item.product.barcode)).size;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" id="main-display-container">
      {/* 1. Interactive Tab Headers with elegant material-style lines */}
      <div className="bg-white border-b border-slate-200 flex flex-nowrap overflow-x-auto divide-x divide-slate-100" id="tabs-row">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-4 text-xs font-bold tracking-wider uppercase transition-all duration-150 relative shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'text-indigo-600 bg-slate-50/50 font-extrabold border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          id="tab-all"
        >
          Все товары ({items.length})
        </button>

        {boxNumbers.map((boxNum) => {
          const countForBox = items.filter((item) => item.boxNumber === boxNum).length;
          return (
            <button
              key={boxNum}
              onClick={() => setActiveTab(boxNum)}
              className={`px-6 py-4 text-xs font-bold tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === boxNum
                  ? 'text-indigo-600 bg-slate-50/50 font-extrabold border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              id={`tab-box-${boxNum}`}
            >
              <span>Коробка {boxNum}</span>
              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px] text-slate-500 font-bold">
                {countForBox}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Main Shipment Items List */}
      <div className="flex-1 min-h-[350px] relative">
        <AnimatePresence mode="wait">
          {displayedItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-24 px-6"
              id="empty-state"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Box className="w-6 h-6 text-slate-350 animate-bounce" />
              </div>
              <p className="text-slate-500 font-bold text-sm">В этой вкладке пока нет добавленных товаров</p>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm font-medium">
                Воспользуйтесь формой слева, чтобы выбрать товар из базы данных, указать количество, номер коробки и добавить в эту виртуальную поставку.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto"
              id="items-table-wrapper"
            >
              <table className="w-full text-left" id="shipment-items-table">
                <thead className="bg-slate-55 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">#</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Товар</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Баркод / Артикул</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-28">Кол-во</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-28">Коробка</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-24">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedItems.map((item, index) => {
                    const isReplacingActive = replacingItemId === item.id;
                    const isLatestItem = index === 0 && activeTab === 'all'; // highlight top item
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`transition-colors group ${isLatestItem ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'}`}>
                          {/* Chronological numbering */}
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono">
                            {index + 1}
                          </td>

                          {/* Product Details & Swap trigger */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 leading-snug">
                                {item.product.name}
                              </span>
                              
                              <button
                                onClick={() => {
                                  if (isReplacingActive) {
                                    setReplacingItemId(null);
                                  } else {
                                    setReplacingItemId(item.id);
                                    setReplaceSearchQuery('');
                                  }
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-semibold max-w-max cursor-pointer mt-1"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-indigo-650" />
                                <span>Заменить товар полностью</span>
                              </button>
                            </div>
                          </td>

                          {/* Article and Barcode */}
                          <td className="px-6 py-4 font-mono text-xs text-slate-650">
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium">{item.product.barcode}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.product.article}
                              </span>
                            </div>
                          </td>

                          {/* Inline Quantity editing input */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="1"
                                className="w-16 border border-slate-200 rounded px-2.5 py-1 text-sm text-center font-bold bg-white focus:outline-hidden focus:border-indigo-400"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  onUpdateQty(item.id, isNaN(val) ? 0 : Math.max(1, val));
                                }}
                              />
                            </div>
                          </td>

                          {/* Inline Box Number editing input */}
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                              № {item.boxNumber}
                            </span>
                            <div className="mt-1 flex items-center justify-center">
                              <input
                                type="number"
                                min="1"
                                className="w-12 border border-slate-100 text-[10px] text-center rounded text-slate-500 bg-transparent py-0.5 focus:bg-white focus:border-indigo-200"
                                value={item.boxNumber === 0 ? '' : item.boxNumber}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  onUpdateBoxNum(item.id, isNaN(val) ? 0 : Math.max(1, val));
                                }}
                                title="Редактировать коробку"
                              />
                            </div>
                          </td>

                          {/* Action icons matched with template */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setReplacingItemId(item.id);
                                  setReplaceSearchQuery('');
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-indigo-600 cursor-pointer transition-colors"
                                title="Изменить"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              
                              <button
                                onClick={() => onRemoveItem(item.id)}
                                className="p-1 hover:bg-red-50 rounded text-slate-450 hover:text-red-650 cursor-pointer transition-colors"
                                title="Удалить"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Product Replacer Search dropdown */}
                        {isReplacingActive && (
                          <tr className="bg-indigo-50/10">
                            <td colSpan={6} className="px-6 py-3">
                              <div className="bg-white border border-indigo-150 rounded-lg p-4 flex flex-col gap-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <Search className="w-4 h-4 text-indigo-600" />
                                    <span>Замена товара №{index + 1}</span>
                                  </div>
                                  <button
                                    onClick={() => setReplacingItemId(null)}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 font-medium"
                                  placeholder="Начните искать новый товар по названию, артикулу или баркоду..."
                                  value={replaceSearchQuery}
                                  onChange={(e) => setReplaceSearchQuery(e.target.value)}
                                />

                                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                                  {filteredDatabase.map((dbProduct) => (
                                    <button
                                      key={dbProduct.id}
                                      onClick={() => handleProductReplacement(item.id, dbProduct)}
                                      className="w-full text-left p-2.5 hover:bg-indigo-50/30 rounded-lg flex justify-between items-center transition-colors border border-slate-50 hover:border-slate-100"
                                    >
                                      <div className="flex flex-col justify-start">
                                        <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                                          {dbProduct.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          Арт: {dbProduct.article}
                                        </span>
                                      </div>
                                      <div className="text-right flex flex-col items-end shrink-0">
                                        <span className="bg-indigo-50 text-indigo-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-100/50">
                                          БК: {dbProduct.barcode}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {replaceSearchQuery && filteredDatabase.length === 0 && (
                                    <span className="text-xs text-center text-slate-400 py-4 font-medium">
                                      Упс, по вашему запросу товары в базе не найдены.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Grid feedback statistics matched with style template */}
              <div className="bg-slate-50/70 px-6 py-4.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 gap-3">
                 <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600 font-medium">
                   <span>Общее кол-во: <strong className="text-slate-900">{totalQtyInTab} шт.</strong></span>
                   <span>Уникальных SKU: <strong className="text-slate-900">{uniqueSKUsInTab}</strong></span>
                 </div>
                 <div className="text-slate-400 italic text-xs font-mono">Автоматическое сохранение локально</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
