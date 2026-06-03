import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Boxes, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onDownloadXLSX: () => void;
  onDownloadPDF: () => Promise<void>;
  itemsCount: number;
}

export default function Header({ onDownloadXLSX, onDownloadPDF, itemsCount }: HeaderProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showXlsSuccess, setShowXlsSuccess] = useState(false);
  const [showPdfSuccess, setShowPdfSuccess] = useState(false);

  const handleXlsxDownload = () => {
    onDownloadXLSX();
    setShowXlsSuccess(true);
    setTimeout(() => setShowXlsSuccess(false), 2000);
  };

  const handlePdfDownload = async () => {
    if (isPdfLoading) return;
    setIsPdfLoading(true);
    try {
      await onDownloadPDF();
      setShowPdfSuccess(true);
      setTimeout(() => setShowPdfSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shadow-xs" id="app-header">
      {/* Brand Title with "Черновик" label & dynamic styling */}
      <div className="flex items-center gap-4" id="brand-info">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          <h2 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">Текущая поставка: #WB-7729</h2>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
          Черновик
        </span>
      </div>

      {/* Action Buttons: download xlsx/pdf */}
      <div className="flex items-center gap-2.5" id="download-actions">
        {/* Download XLSX Button */}
        <button
          type="button"
          onClick={handleXlsxDownload}
          disabled={itemsCount === 0}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
            itemsCount === 0
              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
              : showXlsSuccess
              ? 'bg-emerald-55 border-emerald-300 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-350 cursor-pointer shadow-2xs'
          }`}
          id="btn-download-xlsx"
        >
          {showXlsSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <span>Загружено!</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Скачать XLSX</span>
            </>
          )}
        </button>

        {/* Download PDF Button */}
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={itemsCount === 0 || isPdfLoading}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
            itemsCount === 0
              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
              : showPdfSuccess
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 cursor-pointer shadow-2xs'
          }`}
          id="btn-download-pdf"
        >
          {isPdfLoading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Загрузка...</span>
            </>
          ) : showPdfSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
              <span>PDF Готов!</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5 text-red-650" />
              <span>Скачать PDF</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
