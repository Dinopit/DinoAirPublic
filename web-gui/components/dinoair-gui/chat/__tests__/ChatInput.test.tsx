import React from 'react';
import { render, screen } from '../../../../tests/utils/test-utils';
import userEvent from '@testing-library/user-event';
import ChatInput from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();
  const mockOnCancelStreaming = jest.fn();

  const defaultProps = {
    isLoading: false,
    isStreaming: false,
    onSendMessage: mockOnSendMessage,
    onCancelStreaming: mockOnCancelStreaming,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render input textarea and send button', () => {
    render(<ChatInput {...defaultProps} />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('should update input value when typing', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Hello world');

    expect(textarea).toHaveValue('Hello world');
  });

  it('should send message when Send button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test message');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(textarea).toHaveValue('');
  });

  it('should send message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(textarea).toHaveValue('');
  });

  it('should not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(mockOnSendMessage).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Test message');
  });

  it('should not send empty messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, '   '); // Only spaces
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should disable input when loading', () => {
    render(<ChatInput {...defaultProps} isLoading={true} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toBeDisabled();
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInput {...defaultProps} />);

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test');

    expect(sendButton).not.toBeDisabled();
  });

  it('should show Stop button when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);

    expect(screen.queryByText('Send')).not.toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('should call onCancelStreaming when Stop button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} isStreaming={true} />);

    const stopButton = screen.getByText('Stop');
    await user.click(stopButton);

    expect(mockOnCancelStreaming).toHaveBeenCalled();
  });

  it('should not send message when loading even with text', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} isLoading={true} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test message');
    
    // Try to send via Enter key
    await user.keyboard('{Enter}');

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should have proper styling classes', () => {
    render(<ChatInput {...defaultProps} />);

    const container = screen.getByPlaceholderText('Type your message...').parentElement?.parentElement;
    expect(container).toHaveClass('p-4', 'border-t', 'bg-card');

    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toHaveClass(
      'flex-1',
      'p-3',
      'border',
      'rounded-lg',
      'resize-none',
      'bg-background',
      'text-foreground'
    );

    const sendButton = screen.getByText('Send');
    expect(sendButton).toHaveClass(
      'px-4',
      'py-2',
      'bg-primary',
      'text-primary-foreground',
      'rounded-lg'
    );
  });

  it('should have proper styling for Stop button', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);

    const stopButton = screen.getByText('Stop');
    expect(stopButton).toHaveClass(
      'px-4',
      'py-2',
      'bg-red-500',
      'text-white',
      'rounded-lg'
    );
  });

  it('should trim whitespace from messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, '  Test message  ');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should maintain focus after sending message', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    // Textarea should remain focused after sending
    expect(textarea).toHaveFocus();
  });
});
