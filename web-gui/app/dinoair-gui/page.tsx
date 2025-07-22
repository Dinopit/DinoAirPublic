'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const LocalGui = dynamic(() => import('@/components/dinoair-gui/LocalGui'), {
  ssr: false,
});

export default function DinoAirGUIPage() {
  return (
    <main>
      <LocalGui />
    </main>
  );
}