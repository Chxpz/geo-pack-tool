'use client';

import { useCallback } from 'react';

interface Business {
  id: string;
  name: string;
  type: string;
}

interface BusinessSelectorProps {
  businesses: Business[];
  selectedId: string;
  onSelect: (businessId: string) => void;
  disabled?: boolean;
}

export function BusinessSelector({
  businesses,
  selectedId,
  onSelect,
  disabled = false,
}: BusinessSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSelect(e.target.value);
    },
    [onSelect]
  );

  const selectedBusiness = businesses.find((b) => b.id === selectedId);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="business-select" className="text-sm font-medium text-gray-700">
        Select Business
      </label>
      <select
        id="business-select"
        value={selectedId}
        onChange={handleChange}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Choose a business...</option>
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name} ({business.type})
          </option>
        ))}
      </select>
      {selectedBusiness && (
        <p className="text-xs text-gray-500">
          Type: <span className="font-medium">{selectedBusiness.type}</span>
        </p>
      )}
    </div>
  );
}
