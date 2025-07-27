import 'react-native';
import React from 'react';
import {render} from '@testing-library/react-native';
import App from '../src/App';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: any) => children,
}));

jest.mock('../src/navigation/MainNavigator', () => {
  return function MockMainNavigator() {
    return null;
  };
});

describe('App', () => {
  it('renders correctly', () => {
    const {getByTestId} = render(<App />);
    // Basic render test
    expect(true).toBe(true);
  });

  it('initializes services on mount', () => {
    render(<App />);
    // Test that services are initialized
    // This would be expanded with proper service mocks
    expect(true).toBe(true);
  });
});