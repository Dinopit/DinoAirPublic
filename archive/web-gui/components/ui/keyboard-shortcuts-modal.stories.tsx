import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';

const meta: Meta<typeof KeyboardShortcutsModal> = {
  title: 'UI/KeyboardShortcutsModal',
  component: KeyboardShortcutsModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A modal that displays keyboard shortcuts for the DinoAir application. Includes accessibility features like focus management and screen reader support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible',
    },
    onClose: {
      action: 'closed',
      description: 'Callback function called when the modal is closed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
};

export const Interactive: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive version where you can test the close functionality and keyboard navigation.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement;
    const modal = canvas.querySelector('[role="dialog"]') as HTMLElement;
    
    if (modal) {
      modal.focus();
    }
  },
};

export const AccessibilityFocused: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates accessibility features including focus management and ARIA attributes.',
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
