import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './toast';

const ToastDemo = ({ message, type, duration }: { message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => {
  const { addToast } = useToast();
  
  useEffect(() => {
    addToast({ 
      title: message, 
      type, 
      ...(duration !== undefined && { duration })
    });
  }, [addToast, message, type, duration]);
  
  return <div>Toast will appear in bottom-right corner</div>;
};

const meta: Meta<typeof ToastDemo> = {
  title: 'UI/Toast',
  component: ToastDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A toast notification component with accessibility features and multiple variants for different message types.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'The message to display in the toast',
    },
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'The type of toast notification',
    },
    duration: {
      control: 'number',
      description: 'Duration in milliseconds before auto-close (0 = no auto-close)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    message: 'Operation completed successfully!',
    type: 'success',
    duration: 0,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export const Error: Story = {
  args: {
    message: 'An error occurred while processing your request.',
    type: 'error',
    duration: 0,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export const Warning: Story = {
  args: {
    message: 'Please check your input and try again.',
    type: 'warning',
    duration: 0,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export const Info: Story = {
  args: {
    message: 'New features are now available in the settings panel.',
    type: 'info',
    duration: 0,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export const LongMessage: Story = {
  args: {
    message: 'This is a very long toast message that demonstrates how the component handles longer text content. It should wrap appropriately and maintain good readability.',
    type: 'info',
    duration: 0,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export const AutoClose: Story = {
  args: {
    message: 'This toast will auto-close after 3 seconds.',
    type: 'success',
    duration: 3000,
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates auto-close functionality with a 3-second timer.',
      },
    },
  },
};
