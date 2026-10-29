import React, { useState, useRef } from 'react';
import {
  Database,
  UploadCloud,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Table,
  Sparkles
} from 'lucide-react';
import { uploadCsvFile, triggerModelTraining } from '../services/api';

interface DataManagementPageProps {
  onDataImported: () => void;
}

export const DataManagementPage: React.FC<DataManagementPageProps> = ({ onDataImported }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setUploadResult(null);

    // Read first few lines for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const previewRows = lines.slice(0, 6).map((line) => line.split(',').map((c) => c.trim()));
      setFilePreview(previewRows);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadCsvFile(selectedFile);
      setUploadResult(result);
      onDataImported();
    } catch (err: any) {
      setError(err.message || 'CSV Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Dataset Ingestion & Management
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Import simulation logs, preview rows, validate schemas, or export collected records.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/data/template"
            download="bus_occupancy_template.csv"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" /> Download Template
          </a>

          <a
            href="/api/data/export"
            download="smartbus_observations.csv"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export All Observations
          </a>
        </div>
      </div>

      {/* CSV Upload & Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dropzone */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Upload Occupancy CSV</h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            <UploadCloud className="w-10 h-10 text-blue-400 mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-200">
              {selectedFile ? selectedFile.name : 'Click to browse or drop CSV file here'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Required columns: time_s, entries, exits, passengers, occupancy_pct
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {uploadResult && (
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Import Status: {uploadResult.status?.toUpperCase()}
              </div>
              <p>Successfully imported: {uploadResult.imported_rows} observations</p>
              {uploadResult.rejected_rows > 0 && (
                <p className="text-amber-400">Rejected rows: {uploadResult.rejected_rows}</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Validating & Importing...' : 'Validate & Import'}
            </button>
          </div>
        </div>

        {/* File Preview Table */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-400" /> Schema & Data Preview
            </h3>
            <span className="text-xs text-slate-400">
              {filePreview.length > 0 ? `${filePreview.length - 1} rows shown` : 'No file selected'}
            </span>
          </div>

          {filePreview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/50">
                  <tr>
                    {filePreview[0]?.map((header, idx) => (
                      <th key={idx} className="py-2 px-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filePreview.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/20">
                      {row.map((val, colIdx) => (
                        <td key={colIdx} className="py-2 px-3 text-slate-300">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center text-slate-500 text-xs">
              Select or drop a CSV file to inspect columns and preview sample rows before committing to the database.
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300">Validation Protocol:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Header must include <code>time_s, entries, exits, passengers, occupancy_pct</code></li>
              <li>Passenger counts are verified against physical capacity [0, 40]</li>
              <li>Occupancy percentages are cross-verified against seat capacity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
