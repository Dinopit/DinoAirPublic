'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, BarChart3, Lightbulb } from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

interface ConsentBannerProps {
  onConsentUpdate?: (preferences: ConsentPreferences) => void;
}

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  improvements: boolean;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentUpdate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    improvements: false
  });

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const hasConsent = localStorage.getItem('dinoair-consent-given');
      if (!hasConsent) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error checking consent status:', error);
      setIsVisible(true);
    }
  };

  const updatePreference = (type: keyof ConsentPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const saveConsent = async (consentPrefs: ConsentPreferences) => {
    try {
      setLoading(true);

      const response = await fetch('/api/privacy/consent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consentPrefs),
      });

      if (response.ok) {
        localStorage.setItem('dinoair-consent-given', 'true');
        localStorage.setItem('dinoair-consent-preferences', JSON.stringify(consentPrefs));
        setIsVisible(false);
        onConsentUpdate?.(consentPrefs);
        toast.success('Privacy preferences saved');
      } else {
        throw new Error('Failed to save consent');
      }
    } catch (error) {
      console.error('Error saving consent:', error);
      toast.error('Failed to save privacy preferences');
    } finally {
      setLoading(false);
    }
  };

  const acceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      improvements: true
    };
    setPreferences(allConsent);
    saveConsent(allConsent);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      improvements: false
    };
    setPreferences(essentialOnly);
    saveConsent(essentialOnly);
  };

  const saveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Privacy Preferences</h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-muted rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          We respect your privacy. Choose which data collection you're comfortable with. 
          You can change these preferences anytime in Settings.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Shield className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Essential</h4>
                <input
                  type="checkbox"
                  checked={preferences.essential}
                  disabled={true}
                  className="w-4 h-4 rounded opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Required for authentication, chat functionality, and security.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Analytics</h4>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => updatePreference('analytics', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Help us understand usage patterns and improve performance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Improvements</h4>
                <input
                  type="checkbox"
                  checked={preferences.improvements}
                  onChange={(e) => updatePreference('improvements', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Feature development data to build better AI experiences.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={acceptAll}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Accept All'}
          </button>
          <button
            onClick={acceptEssential}
            disabled={loading}
            className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          >
            Essential Only
          </button>
          <button
            onClick={saveCustom}
            disabled={loading}
            className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
          <a
            href="/docs/PRIVACY_POLICY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm text-primary hover:underline flex items-center"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};
