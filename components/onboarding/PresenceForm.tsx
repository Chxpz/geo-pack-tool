'use client';

import { useState } from 'react';

export interface PresenceFormData {
  google_business_profile_url?: string;
  zillow_url?: string;
  realtor_com_url?: string;
  yelp_url?: string;
  tripadvisor_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

interface PresenceFormProps {
  onNext: (data: PresenceFormData) => void;
  onBack: () => void;
  businessType: string;
}

export function PresenceForm({ onNext, onBack, businessType }: PresenceFormProps) {
  const [formData, setFormData] = useState<PresenceFormData>({});

  const isRealtor =
    businessType === 'Real Estate Agent' || businessType === 'Real Estate Brokerage';
  const isRestaurant = businessType === 'Restaurant';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Google Business Profile */}
      <div>
        <label
          htmlFor="google_business_profile_url"
          className="block text-sm font-medium text-gray-900"
        >
          Google Business Profile URL
        </label>
        <input
          type="url"
          id="google_business_profile_url"
          name="google_business_profile_url"
          value={formData.google_business_profile_url || ''}
          onChange={handleInputChange}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://www.google.com/business/"
        />
      </div>

      {/* Real Estate Specific Fields */}
      {isRealtor && (
        <div className="space-y-4 rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">Real Estate Profiles</h3>

          <div>
            <label htmlFor="zillow_url" className="block text-sm font-medium text-gray-900">
              Zillow URL
            </label>
            <input
              type="url"
              id="zillow_url"
              name="zillow_url"
              value={formData.zillow_url || ''}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.zillow.com/profile/"
            />
          </div>

          <div>
            <label htmlFor="realtor_com_url" className="block text-sm font-medium text-gray-900">
              Realtor.com URL
            </label>
            <input
              type="url"
              id="realtor_com_url"
              name="realtor_com_url"
              value={formData.realtor_com_url || ''}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.realtor.com/realestateagents/"
            />
          </div>
        </div>
      )}

      {/* Restaurant Specific Fields */}
      {isRestaurant && (
        <div className="space-y-4 rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">Restaurant Profiles</h3>

          <div>
            <label htmlFor="yelp_url" className="block text-sm font-medium text-gray-900">
              Yelp URL
            </label>
            <input
              type="url"
              id="yelp_url"
              name="yelp_url"
              value={formData.yelp_url || ''}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.yelp.com/biz/"
            />
          </div>

          <div>
            <label htmlFor="tripadvisor_url" className="block text-sm font-medium text-gray-900">
              TripAdvisor URL
            </label>
            <input
              type="url"
              id="tripadvisor_url"
              name="tripadvisor_url"
              value={formData.tripadvisor_url || ''}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.tripadvisor.com/Restaurant_Review"
            />
          </div>
        </div>
      )}

      {/* General Social Media */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Social Media Profiles</h3>

        <div>
          <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-900">
            LinkedIn Profile
          </label>
          <input
            type="url"
            id="linkedin_url"
            name="linkedin_url"
            value={formData.linkedin_url || ''}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.linkedin.com/in/"
          />
        </div>

        <div>
          <label htmlFor="facebook_url" className="block text-sm font-medium text-gray-900">
            Facebook Page
          </label>
          <input
            type="url"
            id="facebook_url"
            name="facebook_url"
            value={formData.facebook_url || ''}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.facebook.com/"
          />
        </div>

        <div>
          <label htmlFor="instagram_url" className="block text-sm font-medium text-gray-900">
            Instagram Profile
          </label>
          <input
            type="url"
            id="instagram_url"
            name="instagram_url"
            value={formData.instagram_url || ''}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.instagram.com/"
          />
        </div>

        <div>
          <label htmlFor="twitter_url" className="block text-sm font-medium text-gray-900">
            Twitter / X Profile
          </label>
          <input
            type="url"
            id="twitter_url"
            name="twitter_url"
            value={formData.twitter_url || ''}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://twitter.com/"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue →
        </button>
      </div>
    </form>
  );
}
