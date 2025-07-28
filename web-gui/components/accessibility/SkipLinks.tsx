/**
 * Skip Link Component
 * Provides skip navigation for keyboard and screen reader users
 */

'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { preferences } from '../../contexts/accessibility-context';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  const { preferences } = useAccessibility();

  return (
    <a
      href={href}
      className={`
        absolute -top-10 left-4 z-[9999] px-4 py-2 
        bg-primary text-primary-foreground text-sm font-medium
        rounded-md shadow-lg transition-all duration-200
        focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${preferences.highContrast ? 'ring-2 ring-primary' : ''}
        ${className}
      `}
      onFocus={(e) => {
        // Ensure the skip link is visible when focused
        e.currentTarget.style.position = 'absolute';
        e.currentTarget.style.top = '1rem';
      }}
      onBlur={(e) => {
        // Hide the skip link when not focused
        e.currentTarget.style.top = '-2.5rem';
      }}
    >
      {children}
    </a>
  );
}

export function SkipLinks() {
  const { t } = useTranslation();

  return (
    <div className="sr-only-until-focus">
      <SkipLink href="#main-content">{t('accessibility.skipToMain')}</SkipLink>
      <SkipLink href="#navigation">{t('navigation.menu')}</SkipLink>
      <SkipLink href="#accessibility-settings">{t('settings.accessibility')}</SkipLink>
    </div>
  );
}
