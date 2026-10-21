import React, { useState, useRef } from 'react';
import { X, FileUp, Download, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../api';

interface BulkImportModalProps {
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    duplicateCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const csvContent = `Name,Father Name,Mobile,Village,Bank Name,Account Number,IFSC
Suresh Patidar,Ramdev Patidar,9829911223,Kanwas,State Bank of India,38192049182,SBIN0031245
Mahesh Gurjar,Bhanwarlal Gurjar,9414088776,Ladpura,Bank of Baroda,492801000991,BARB0KOTAXX
Kailash Meena,Raghunath Meena,9828077665,Sangod,Punjab National Bank,1827000100445566,PUNB0182700`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Sample_Farmers_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setPreviewError('File must contain at least a header row and 1 data row.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cells.length < 3) continue;

          const rowObj: any = {};
          headers.forEach((header, idx) => {
            if (header.includes('father')) rowObj.fatherName = cells[idx] || '';
            else if (header.includes('name')) rowObj.name = cells[idx] || '';
            else if (header.includes('mobile') || header.includes('phone')) rowObj.mobile = cells[idx] || '';
            else if (header.includes('village')) rowObj.village = cells[idx] || '';
            else if (header.includes('bank')) rowObj.bankName = cells[idx] || '';
            else if (header.includes('account') || header.includes('acc')) rowObj.accountNumber = cells[idx] || '';
            else if (header.includes('ifsc')) rowObj.ifsc = cells[idx] || '';
          });

          if (rowObj.name && rowObj.mobile) {
            rows.push(rowObj);
          }
        }

        if (rows.length === 0) {
          setPreviewError('No valid rows found. Please check column headers (Name, Mobile, Village).');
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setPreviewError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);

    try {
      const result = await api.importBulkFarmers(parsedRows);
      setImportResult(result);
      if (result.importedCount > 0) {
        onImportSuccess(result.importedCount);
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-slate-900">Bulk Import Farmers from CSV</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Download Template */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-800">CSV Column Format</div>
            <div className="text-slate-500 mt-0.5">Name, Father Name, Mobile, Village, Bank Name, Account Number, IFSC</div>
          </div>
          <button
            onClick={handleDownloadSample}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Template</span>
          </button>
        </div>

        {/* Step 2: Upload CSV */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-emerald-700 rounded-xl text-center text-xs text-slate-600 bg-slate-50/50 hover:bg-emerald-50/30 transition flex flex-col items-center justify-center"
          >
            <FileUp className="w-6 h-6 text-slate-400 mb-1" />
            <span className="font-semibold text-slate-800">Click to Select CSV File</span>
            <span className="text-slate-400 text-[11px] mt-0.5">Supports UTF-8 CSV exports from Excel</span>
          </button>
        </div>

        {previewError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{previewError}</span>
          </div>
        )}

        {/* Import Results Summary */}
        {importResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Import Completed Successfully!</span>
            </div>
            <div className="text-emerald-800">
              • <strong>{importResult.importedCount}</strong> new farmer profile(s) created.
            </div>
            <div className="text-amber-800">
              • <strong>{importResult.duplicateCount}</strong> duplicate record(s) skipped to protect data integrity.
            </div>
            {importResult.errors.length > 0 && (
              <div className="text-red-700 mt-1">
                Errors: {importResult.errors.join('; ')}
              </div>
            )}
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && !importResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Preview: {parsedRows.length} Farmers Found</span>
              <span className="text-emerald-700">Ready to validate &amp; import</span>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">Village</th>
                    <th className="px-3 py-2">Bank</th>
                    <th className="px-3 py-2">Account #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {parsedRows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-bold text-slate-800">{r.name}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{r.mobile}</td>
                      <td className="px-3 py-1.5 text-slate-600">{r.village}</td>
                      <td className="px-3 py-1.5 text-slate-600">{r.bankName || 'N/A'}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{r.accountNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 8 && (
              <div className="text-[11px] text-slate-400 text-center">
                + {parsedRows.length - 8} more rows will be imported
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>
          {!importResult && parsedRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition"
            >
              {importing ? 'Importing Farmers...' : `Import ${parsedRows.length} Farmers`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
