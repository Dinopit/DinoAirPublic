import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingTutorial } from './onboarding-tutorial';

const meta: Meta<typeof OnboardingTutorial> = {
  title: 'UI/OnboardingTutorial',
  component: OnboardingTutorial,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'An interactive onboarding tutorial that guides users through DinoAir features. Includes accessibility features like focus management and screen reader support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the tutorial is visible',
    },
    onClose: {
      action: 'closed',
      description: 'Callback function called when the tutorial is closed',
    },
    onComplete: {
      action: 'completed',
      description: 'Callback function called when the tutorial is completed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    onComplete: () => {},
  },
};

export const Interactive: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive version where you can test the tutorial flow and navigation.',
      },
    },
  },
};

export const AccessibilityFocused: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates accessibility features including keyboard navigation and screen reader support.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
        ],
      },
    },
  },
};
