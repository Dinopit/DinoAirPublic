import React from 'react';
import { render, screen } from '../../../../tests/utils/test-utils';
import ChatMessages from '../ChatMessages';
import { createMockMessage } from '../../../../tests/utils/mock-utils';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('ChatMessages', () => {
  const defaultProps = {
    messages: [],
    isLoading: false,
    isStreaming: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty message list', () => {
    render(<ChatMessages {...defaultProps} />);

    const container = screen.getByRole('generic').querySelector('.space-y-4');
    expect(container).toBeInTheDocument();
    expect(container?.children).toHaveLength(1); // Only the ref div
  });

  it('should render messages', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'user', content: 'Hello' }),
      createMockMessage({ id: '2', role: 'assistant', content: 'Hi there!' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should display user messages on the right', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'user', content: 'User message' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const messageContainer = screen.getByText('User message').closest('.flex');
    expect(messageContainer).toHaveClass('justify-end');
  });

  it('should display assistant messages on the left', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'assistant', content: 'Assistant message' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const messageContainer = screen.getByText('Assistant message').closest('.flex');
    expect(messageContainer).toHaveClass('justify-start');
  });

  it('should display message timestamps', () => {
    const timestamp = new Date('2024-01-01T12:00:00');
    const messages = [
      createMockMessage({ id: '1', content: 'Test', timestamp }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    expect(screen.getByText(timestamp.toLocaleTimeString())).toBeInTheDocument();
  });

  it('should show loading indicator when loading but not streaming', () => {
    render(<ChatMessages {...defaultProps} isLoading={true} isStreaming={false} />);

    // Check for animated dots
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-bounce')
    );
    expect(dots).toHaveLength(3);
  });

  it('should not show loading indicator when streaming', () => {
    render(<ChatMessages {...defaultProps} isLoading={true} isStreaming={true} />);

    const dots = screen.queryAllByRole('generic').filter(el => 
      el.className.includes('animate-bounce')
    );
    expect(dots).toHaveLength(0);
  });

  it('should scroll to bottom when messages change', () => {
    const { rerender } = render(<ChatMessages {...defaultProps} />);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    const messages = [
      createMockMessage({ id: '1', content: 'New message' }),
    ];

    rerender(<ChatMessages {...defaultProps} messages={messages} />);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('should apply proper styling to user messages', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'user', content: 'User message' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const messageDiv = screen.getByText('User message').parentElement;
    expect(messageDiv).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('should apply proper styling to assistant messages', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'assistant', content: 'Assistant message' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const messageDiv = screen.getByText('Assistant message').parentElement;
    expect(messageDiv).toHaveClass('bg-muted', 'text-foreground');
  });

  it('should render messages in order', () => {
    const messages = [
      createMockMessage({ id: '1', content: 'First' }),
      createMockMessage({ id: '2', content: 'Second' }),
      createMockMessage({ id: '3', content: 'Third' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const allMessages = screen.getAllByText(/^(First|Second|Third)$/);
    expect(allMessages[0]).toHaveTextContent('First');
    expect(allMessages[1]).toHaveTextContent('Second');
    expect(allMessages[2]).toHaveTextContent('Third');
  });

  it('should preserve whitespace in messages', () => {
    const messages = [
      createMockMessage({ 
        id: '1', 
        content: 'Line 1\nLine 2\n\nLine 4 with    spaces' 
      }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    const messageElement = screen.getByText(/Line 1/);
    expect(messageElement).toHaveClass('whitespace-pre-wrap');
  });

  it('should have proper container styling', () => {
    render(<ChatMessages {...defaultProps} />);

    const container = screen.getByRole('generic').querySelector('.flex-grow');
    expect(container).toHaveClass('p-4', 'overflow-y-auto');

    const innerContainer = screen.getByRole('generic').querySelector('.space-y-4');
    expect(innerContainer).toHaveClass('max-w-4xl', 'mx-auto');
  });

  it('should handle empty content gracefully', () => {
    const messages = [
      createMockMessage({ id: '1', content: '' }),
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);

    // Should still render the message container with timestamp
    const timestamps = screen.getAllByText(/:/); // Time format includes colons
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('should apply staggered animation delays to loading dots', () => {
    render(<ChatMessages {...defaultProps} isLoading={true} isStreaming={false} />);

    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-bounce')
    );

    expect(dots[0]).toHaveStyle({ animationDelay: undefined });
    expect(dots[1]).toHaveStyle({ animationDelay: '0.1s' });
    expect(dots[2]).toHaveStyle({ animationDelay: '0.2s' });
  });
});