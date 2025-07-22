import React from 'react';
import { render, screen, fireEvent } from '../../tests/utils/test-utils';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Component that throws error in useEffect
const ThrowErrorInEffect = () => {
  React.useEffect(() => {
    throw new Error('Effect error');
  }, []);
  return <div>Component</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Reload page')).toBeInTheDocument();
  });

  it('should display generic error message when error has no message', () => {
    const ThrowEmptyError = () => {
      throw new Error('');
    };

    render(
      <ErrorBoundary>
        <ThrowEmptyError />
      </ErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('should log errors to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Uncaught error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should reset error state when "Try again" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click "Try again"
    fireEvent.click(screen.getByText('Try again'));

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should reload page when "Reload page" is clicked', () => {
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload page'));

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should handle multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();

    // Reset the error
    fireEvent.click(screen.getByText('Try again'));

    // Throw a different error
    const ThrowDifferentError = () => {
      throw new Error('Different error');
    };

    rerender(
      <ErrorBoundary>
        <ThrowDifferentError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Different error')).toBeInTheDocument();
  });

  it('should catch errors from nested components', () => {
    const NestedComponent = () => (
      <div>
        <div>
          <ThrowError shouldThrow={true} />
        </div>
      </div>
    );

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should not catch errors in event handlers', () => {
    const ComponentWithEventError = () => {
      const handleClick = () => {
        throw new Error('Event handler error');
      };

      return <button onClick={handleClick}>Click me</button>;
    };

    render(
      <ErrorBoundary>
        <ComponentWithEventError />
      </ErrorBoundary>
    );

    // ErrorBoundary won't catch this error
    expect(() => {
      fireEvent.click(screen.getByText('Click me'));
    }).toThrow('Event handler error');
  });

  it('should have proper styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const container = screen.getByText('Something went wrong').closest('div');
    expect(container).toHaveClass('max-w-md', 'rounded-lg', 'bg-red-50', 'p-6', 'shadow-lg');

    const tryAgainButton = screen.getByText('Try again');
    expect(tryAgainButton).toHaveClass('rounded', 'bg-red-600', 'px-4', 'py-2', 'text-white', 'hover:bg-red-700');

    const reloadButton = screen.getByText('Reload page');
    expect(reloadButton).toHaveClass('rounded', 'border', 'border-red-600', 'px-4', 'py-2', 'text-red-600', 'hover:bg-red-50');
  });

  it('should maintain error state until explicitly reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Rerender without resetting - error should persist
    rerender(
      <ErrorBoundary>
        <div>New content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('New content')).not.toBeInTheDocument();
  });
});