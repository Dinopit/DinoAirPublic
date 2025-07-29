import type { Meta, StoryObj } from '@storybook/react';
import { PreferencesModal } from './preferences-modal';
import { UserPreferencesProvider } from '@/lib/contexts/UserPreferencesContext';

const meta: Meta<typeof PreferencesModal> = {
  title: 'UI/PreferencesModal',
  component: PreferencesModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive preferences modal that allows users to customize their DinoAir experience including theme, language, accessibility, notifications, chat settings, and advanced options.',
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
  decorators: [
    (Story) => (
      <UserPreferencesProvider>
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </UserPreferencesProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
  },
};

export const AppearanceTab: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'The appearance tab allows users to customize theme mode, language, and visual preferences.',
      },
    },
  },
};

export const AccessibilityTab: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'The accessibility tab provides options for high contrast mode, reduced motion, font size adjustments, and keyboard navigation enhancements.',
      },
    },
  },
};

export const NotificationsTab: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'The notifications tab allows users to control desktop notifications, sound alerts, and specific notification types.',
      },
    },
  },
};

export const ChatTab: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'The chat tab provides settings for auto-save, timestamps, message grouping, and chat history management.',
      },
    },
  },
};

export const AdvancedTab: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'The advanced tab includes debug mode, experimental features, telemetry settings, and import/export functionality.',
      },
    },
  },
};

// Interactive story that demonstrates the full workflow
export const InteractiveDemo: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'An interactive demo showing all tabs and functionality. Try switching between tabs and adjusting settings.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // This could include automated interactions for testing
    // For now, it's just a placeholder for future enhancements
  },
};

// Story showing mobile responsiveness
export const MobileView: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'The preferences modal adapts to mobile screens with responsive design.',
      },
    },
  },
};

// Story showing dark theme
export const DarkTheme: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'The preferences modal in dark theme mode.',
      },
    },
  },
  decorators: [
    (Story) => (
      <UserPreferencesProvider>
        <div style={{ height: '100vh', width: '100vw' }} className="dark">
          <Story />
        </div>
      </UserPreferencesProvider>
    ),
  ],
};