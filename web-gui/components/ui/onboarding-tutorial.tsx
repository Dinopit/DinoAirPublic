'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useFocusManagement } from '../../hooks/useFocusManagement';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DinoAir Free Tier!',
    content: "Let's take a quick tour to help you get started with AI-powered conversations and artifact creation.",
    position: 'center'
  },
  {
    id: 'chat',
    title: 'Chat with AI',
    content: 'Start a conversation by typing your message here. You can ask questions, request code generation, or have a discussion.',
    target: 'textarea[placeholder="Type your message..."]',
    position: 'top'
  },
  {
    id: 'artifacts',
    title: 'Automatic Artifact Creation',
    content: 'When you share code blocks in your messages, they automatically become artifacts that you can view, edit, and export.',
    target: 'button:has-text("Artifacts")',
    position: 'bottom'
  },
  {
    id: 'model',
    title: 'Choose AI Models',
    content: 'Select different AI models based on your needs. Each model has different capabilities and response styles.',
    target: 'select[value*="qwen"]',
    position: 'bottom'
  },
  {
    id: 'personality',
    title: 'AI Personalities',
    content: 'Customize the AI\'s behavior by selecting different personalities or creating your own system prompts.',
    target: 'button:has-text("Settings")',
    position: 'bottom'
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    content: 'Use keyboard shortcuts for quick actions. Press Ctrl/Cmd + / to see all available shortcuts.',
    target: '[aria-label="Keyboard shortcuts"]',
    position: 'left'
  },
  {
    id: 'save',
    title: 'Save Your Work',
    content: 'Save conversations to revisit them later. Your artifacts are automatically saved locally.',
    target: 'button:has-text("Save Chat")',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    content: 'You\'re ready to start using DinoAir Free Tier. Enjoy creating with AI!',
    position: 'center'
  }
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const { containerRef } = useFocusManagement(isOpen, {
    restoreFocus: true,
    trapFocus: true,
    autoFocus: true
  });

  const currentStepData = TUTORIAL_STEPS[currentStep];
  
  if (!currentStepData) {
    return null;
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !currentStepData.target) {
      setHighlightPosition(null);
      return;
    }

    // Wait for elements to be rendered
    const timer = setTimeout(() => {
      const element = document.querySelector(currentStepData.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightPosition(rect);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen, currentStepData]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('dinoair-tutorial-completed', 'true');
    }
    onComplete();
    setCurrentStep(0);
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the tutorial?')) {
      handleComplete();
    }
  };

  const getTooltipPosition = () => {
    if (!highlightPosition || !currentStepData.position || currentStepData.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const padding = 20;

    let top = 0;
    let left = 0;

    switch (currentStepData.position) {
      case 'top':
        top = highlightPosition.top - tooltipHeight - padding;
        left = highlightPosition.left + highlightPosition.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = highlightPosition.bottom + padding;
        left = highlightPosition.left + highlightPosition.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = highlightPosition.top + highlightPosition.height / 2 - tooltipHeight / 2;
        left = highlightPosition.left - tooltipWidth - padding;
        break;
      case 'right':
        top = highlightPosition.top + highlightPosition.height / 2 - tooltipHeight / 2;
        left = highlightPosition.right + padding;
        break;
    }

    // Ensure tooltip stays within viewport
    const maxLeft = window.innerWidth - tooltipWidth - padding;
    const maxTop = window.innerHeight - tooltipHeight - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[100] transition-opacity" 
        aria-hidden="true"
      />

      {/* Highlight */}
      {highlightPosition && (
        <div
          className="fixed z-[101] ring-4 ring-primary ring-offset-4 rounded-lg transition-all duration-300"
          style={{
            top: `${highlightPosition.top - 4}px`,
            left: `${highlightPosition.left - 4}px`,
            width: `${highlightPosition.width + 8}px`,
            height: `${highlightPosition.height + 8}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="fixed z-[102] bg-card rounded-lg shadow-2xl p-6 max-w-sm transition-all duration-300"
        style={getTooltipPosition()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-content"
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 hover:bg-muted rounded-lg transition-colors"
          aria-label="Close tutorial and skip remaining steps"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 id="tutorial-title" className="text-xl font-semibold mb-2">
            {currentStepData.title}
          </h3>
          <p id="tutorial-content" className="text-muted-foreground mb-6">
            {currentStepData.content}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex gap-1" 
            role="progressbar" 
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={TUTORIAL_STEPS.length}
            aria-label={`Tutorial progress: step ${currentStep + 1} of ${TUTORIAL_STEPS.length}`}
          >
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip tutorial and close"
            >
              Skip Tutorial
            </button>
            {currentStep === TUTORIAL_STEPS.length - 1 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded"
                  aria-describedby="dont-show-again-description"
                />
                <span id="dont-show-again-description">
                  Don't show tutorial again on startup
                </span>
              </label>
            )}
          </div>

          <div className="flex gap-2" role="group" aria-label="Tutorial navigation">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go to previous tutorial step"
              aria-disabled={currentStep === 0}
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              aria-label={currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish tutorial' : 'Go to next tutorial step'}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
