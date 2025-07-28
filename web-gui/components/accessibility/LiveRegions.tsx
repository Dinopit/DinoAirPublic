/**
 * Live Region Components
 * ARIA live regions for screen reader announcements
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../../contexts/accessibility-context';
import { type LiveRegionType } from '../../lib/accessibility/utils';

interface LiveRegionProps {
  id?: string;
  priority?: LiveRegionType;
  atomic?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LiveRegion({
  id = 'live-region',
  priority = 'polite',
  atomic = true,
  children,
  className = '',
}: LiveRegionProps) {
  return (
    <div id={id} aria-live={priority} aria-atomic={atomic} className={`sr-only ${className}`}>
      {children}
    </div>
  );
}

export function StatusRegion({ children, ...props }: Omit<LiveRegionProps, 'priority'>) {
  return (
    <LiveRegion priority="polite" {...props}>
      {children}
    </LiveRegion>
  );
}

export function AlertRegion({ children, ...props }: Omit<LiveRegionProps, 'priority'>) {
  return (
    <LiveRegion priority="assertive" {...props}>
      {children}
    </LiveRegion>
  );
}

interface AnnouncementRegionProps {
  announcements: Array<{
    id: string;
    message: string;
    priority: LiveRegionType;
    timestamp: number;
  }>;
}

export function AnnouncementRegion({ announcements }: AnnouncementRegionProps) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const { preferences } = useAccessibility();

  useEffect(() => {
    if (!preferences.announceChanges) return;

    // Clear old announcements after 5 seconds
    const cleanup = setTimeout(() => {
      if (politeRef.current) politeRef.current.textContent = '';
      if (assertiveRef.current) assertiveRef.current.textContent = '';
    }, 5000);

    return () => clearTimeout(cleanup);
  }, [announcements, preferences.announceChanges]);

  const politeAnnouncements = announcements.filter((a) => a.priority === 'polite');
  const assertiveAnnouncements = announcements.filter((a) => a.priority === 'assertive');

  return (
    <>
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="polite-announcements"
      >
        {politeAnnouncements.map((announcement) => (
          <div key={announcement.id}>{announcement.message}</div>
        ))}
      </div>

      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="assertive-announcements"
      >
        {assertiveAnnouncements.map((announcement) => (
          <div key={announcement.id}>{announcement.message}</div>
        ))}
      </div>
    </>
  );
}

export function LoadingAnnouncer({
  isLoading,
  loadingText = 'Loading...',
  loadedText = 'Content loaded',
}: {
  isLoading: boolean;
  loadingText?: string;
  loadedText?: string;
}) {
  const { preferences } = useAccessibility();

  if (!preferences.announceChanges) return null;

  return <StatusRegion id="loading-announcer">{isLoading ? loadingText : loadedText}</StatusRegion>;
}
