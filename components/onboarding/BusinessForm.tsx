'use client';

import { useState } from 'react';

export interface BusinessFormData {
  business_name: string;
  business_type: string;
  website_url?: string;
  phone?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  service_areas: string[];
}

interface BusinessFormProps {
  onNext: (data: BusinessFormData) => void;
  initialData?: Partial<BusinessFormData>;
}

const BUSINESS_TYPES = [
  { value: 'realtor', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'dental', label: 'Dental Practice' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'accountant', label: 'Accounting / Finance' },
  { value: 'saas', label: 'SaaS / Tech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'agency', label: 'Agency' },
  { value: 'medical', label: 'Medical Practice' },
  { value: 'fitness', label: 'Fitness / Wellness' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
] as const;

export function BusinessForm({ onNext, initialData }: BusinessFormProps) {
  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: initialData?.business_name || '',
    business_type: initialData?.business_type || '',
    website_url: initialData?.website_url || '',
    phone: initialData?.phone || '',
    address_city: initialData?.address_city || '',
    address_state: initialData?.address_state || '',
    address_zip: initialData?.address_zip || '',
    service_areas: initialData?.service_areas || [],
  });

  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    } else if (formData.business_name.trim().length < 2) {
      newErrors.business_name = 'Business name must be at least 2 characters';
    }

    if (!formData.business_type) {
      newErrors.business_type = 'Business type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleAddServiceArea = () => {
    if (serviceAreaInput.trim()) {
      const areas = serviceAreaInput
        .split(',')
        .map((area) => area.trim())
        .filter((area) => area.length > 0);

      setFormData((prev) => ({
        ...prev,
        service_areas: [...prev.service_areas, ...areas],
      }));
      setServiceAreaInput('');
    }
  };

  const handleRemoveServiceArea = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      service_areas: prev.service_areas.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Name */}
      <div>
        <label htmlFor="business_name" className="block text-sm font-medium text-gray-900">
          Business Name *
        </label>
        <input
          type="text"
          id="business_name"
          name="business_name"
          value={formData.business_name}
          onChange={handleInputChange}
          className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.business_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Your Business Name"
        />
        {errors.business_name && (
          <p className="mt-1 text-sm text-red-600">{errors.business_name}</p>
        )}
      </div>

      {/* Business Type */}
      <div>
        <label htmlFor="business_type" className="block text-sm font-medium text-gray-900">
          Business Type *
        </label>
        <select
          id="business_type"
          name="business_type"
          value={formData.business_type}
          onChange={handleInputChange}
          className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.business_type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a business type</option>
          {BUSINESS_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.business_type && (
          <p className="mt-1 text-sm text-red-600">{errors.business_type}</p>
        )}
      </div>

      {/* Website URL */}
      <div>
        <label htmlFor="website_url" className="block text-sm font-medium text-gray-900">
          Website URL
        </label>
        <input
          type="url"
          id="website_url"
          name="website_url"
          value={formData.website_url}
          onChange={handleInputChange}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-900">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Address Section */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Address</h3>

        <div>
          <label htmlFor="address_city" className="block text-sm font-medium text-gray-900">
            City
          </label>
          <input
            type="text"
            id="address_city"
            name="address_city"
            value={formData.address_city}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="San Francisco"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="address_state" className="block text-sm font-medium text-gray-900">
              State
            </label>
            <input
              type="text"
              id="address_state"
              name="address_state"
              value={formData.address_state}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CA"
              maxLength={2}
            />
          </div>

          <div>
            <label htmlFor="address_zip" className="block text-sm font-medium text-gray-900">
              ZIP Code
            </label>
            <input
              type="text"
              id="address_zip"
              name="address_zip"
              value={formData.address_zip}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="94105"
            />
          </div>
        </div>
      </div>

      {/* Service Areas */}
      <div>
        <label htmlFor="service_areas_input" className="block text-sm font-medium text-gray-900">
          Service Areas
        </label>
        <p className="mt-1 text-xs text-gray-600">
          Enter comma-separated areas where you serve clients
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            id="service_areas_input"
            value={serviceAreaInput}
            onChange={(e) => setServiceAreaInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddServiceArea();
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., San Francisco, Oakland, Berkeley"
          />
          <button
            type="button"
            onClick={handleAddServiceArea}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
          >
            Add
          </button>
        </div>

        {formData.service_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.service_areas.map((area, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-900"
              >
                {area}
                <button
                  type="button"
                  onClick={() => handleRemoveServiceArea(index)}
                  className="ml-1 font-bold hover:text-blue-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Continue →
      </button>
    </form>
  );
}
