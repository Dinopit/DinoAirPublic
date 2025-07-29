import { useState, useCallback, useEffect } from 'react';

export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: Date;
}

export const useArtifacts = () => {
  const [artifactNotifications, setArtifactNotifications] = useState<string[]>([]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (artifactNotifications.length > 0) {
      const timer = setTimeout(() => {
        setArtifactNotifications(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [artifactNotifications]);

  const createArtifactsFromCodeBlocks = useCallback((
    artifactInfos: { name: string; type: string; content: string }[]
  ) => {
    try {
      // Load existing artifacts
      const stored = localStorage.getItem('dinoair-artifacts');
      let existingArtifacts: Artifact[] = [];
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          existingArtifacts = Array.isArray(parsed) ? parsed : [];
        } catch {
          existingArtifacts = [];
        }
      }

      // Create new artifacts
      const newArtifacts: Artifact[] = artifactInfos.map(info => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: info.name,
        type: info.type,
        content: info.content,
        createdAt: new Date()
      }));

      // Save artifacts
      const allArtifacts = [...existingArtifacts, ...newArtifacts];
      localStorage.setItem('dinoair-artifacts', JSON.stringify(allArtifacts));

      // Show notifications
      const notifications = newArtifacts.map(artifact =>
        `Created artifact: ${artifact.name}`
      );
      setArtifactNotifications(prev => [...prev, ...notifications]);
    } catch (error) {
      console.error('Failed to create artifacts:', error);
    }
  }, []);

  const dismissNotification = useCallback((index: number) => {
    setArtifactNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    artifactNotifications,
    createArtifactsFromCodeBlocks,
    dismissNotification
  };
};
