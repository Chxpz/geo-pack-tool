'use client';

import { useState } from 'react';
import {
  BusinessForm,
  type BusinessFormData,
} from '@/components/onboarding/BusinessForm';
import {
  PresenceForm,
  type PresenceFormData,
} from '@/components/onboarding/PresenceForm';
import {
  CompetitorForm,
  type CompetitorData,
} from '@/components/onboarding/CompetitorForm';
import { FirstScan } from '@/components/onboarding/FirstScan';

const STEPS = [
  { id: 1, title: 'Business Info', description: 'Tell us about your business' },
  { id: 2, title: 'Online Presence', description: 'Add your online profiles' },
  { id: 3, title: 'Competitors', description: 'Add your competitors' },
  { id: 4, title: 'First Scan', description: 'Start tracking AI mentions' },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Create business
  const handleBusinessFormSubmit = async (data: BusinessFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create business');
      }

      const createdBusiness = await response.json();
      setBusinessId(createdBusiness.id);
      setBusinessType(data.business_type);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Update presence
  const handlePresenceFormSubmit = async (data: PresenceFormData) => {
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          social_profiles: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update presence');
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Add competitors
  const handleCompetitorFormSubmit = async (competitors: CompetitorData[]) => {
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add each competitor
      const createPromises = competitors.map((competitor) =>
        fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            competitor_name: competitor.name,
            website_url: competitor.website_url,
          }),
        })
      );

      const responses = await Promise.all(createPromises);

      // Check if all succeeded
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to add competitor');
        }
      }

      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to AgenticRev</h1>
            <p className="mt-2 text-sm text-gray-600">
              Let&apos;s set up your business and start tracking AI mentions
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <span>✓</span>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-1 flex-1 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                  <p className="mt-4 text-sm text-gray-600">Please wait...</p>
                </div>
              </div>
            )}

            {!isLoading && (
              <>
                {/* Step 1: Business Form */}
                {currentStep === 1 && (
                  <BusinessForm onNext={handleBusinessFormSubmit} />
                )}

                {/* Step 2: Presence Form */}
                {currentStep === 2 && businessId && (
                  <PresenceForm
                    onNext={handlePresenceFormSubmit}
                    onBack={() => setCurrentStep(1)}
                    businessType={businessType}
                  />
                )}

                {/* Step 3: Competitor Form */}
                {currentStep === 3 && businessId && (
                  <CompetitorForm
                    onNext={handleCompetitorFormSubmit}
                    onBack={() => setCurrentStep(2)}
                    businessId={businessId}
                    maxCompetitors={10}
                  />
                )}

                {/* Step 4: First Scan */}
                {currentStep === 4 && businessId && (
                  <FirstScan businessId={businessId} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white py-4">
        <div className="mx-auto max-w-2xl px-4 text-center text-xs text-gray-600 sm:px-6 lg:px-8">
          <p>
            Step {currentStep} of {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}
