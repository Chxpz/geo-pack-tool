'use client';

import { useState, useRef } from 'react';
import { Business, DataImport } from '@/lib/types';

interface ImportFormProps {
  businesses: Business[];
  onImportComplete?: (result: DataImport) => void;
}

export default function ImportForm({ businesses, onImportComplete }: ImportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [importType, setImportType] = useState<'otterly_prompts' | 'otterly_citations' | 'otterly_citations_summary' | 'otterly_visibility' | 'otterly_geo_audit'>('otterly_prompts');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const IMPORT_TYPES = [
    { value: 'otterly_prompts', label: 'Search Prompts' },
    { value: 'otterly_citations', label: 'Citation Links Full' },
    { value: 'otterly_citations_summary', label: 'Citation Links Summary' },
    { value: 'otterly_visibility', label: 'Visibility Report' },
    { value: 'otterly_geo_audit', label: 'GEO Audit' },
  ] as const;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please select a CSV file');
      setStatus('error');
      return;
    }

    setSelectedFile(file);
    setStatus('preview');
    setErrorMessage('');

    // Read file and parse first 5 rows
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    setPreviewRows(rows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !selectedBusinessId) {
      setErrorMessage('Please select a business and file');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('business_id', selectedBusinessId);
      formData.append('import_type', importType);

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      setStatus('success');
      setSelectedFile(null);
      setPreviewRows([]);
      setSelectedBusinessId('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onImportComplete) {
        onImportComplete(result.dataImport);
      }

      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Import failed');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Business</label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a business</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.business_name}
              </option>
            ))}
          </select>
        </div>

        {/* Import Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Import Type</label>
          <select
            value={importType}
            onChange={(e) =>
              setImportType(e.target.value as typeof importType)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {IMPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">CSV File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Preview */}
        {status === 'preview' && previewRows.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {Object.keys(previewRows[0] || {})
                      .slice(0, 5)
                      .map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left font-semibold text-gray-900"
                        >
                          {key}
                        </th>
                      ))}
                    {Object.keys(previewRows[0] || {}).length > 5 && (
                      <th className="px-3 py-2 text-left font-semibold text-gray-900">
                        +{Object.keys(previewRows[0] || {}).length - 5} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      {Object.values(row)
                        .slice(0, 5)
                        .map((val, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-gray-600">
                            {String(val).substring(0, 30)}
                            {String(val).length > 30 ? '...' : ''}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Import completed successfully!
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Processing your import...
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || status === 'error' || !selectedFile}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setPreviewRows([]);
              setStatus('idle');
              setErrorMessage('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
