import { renderHook, act } from '@testing-library/react';
import { useChartPerformance } from '../useChartPerformance';

// Mock performance.now
const originalPerformanceNow = performance.now;
let mockTime = 1000;

beforeEach(() => {
  mockTime = 1000;
  performance.now = jest.fn(() => mockTime);
});

afterEach(() => {
  performance.now = originalPerformanceNow;
});

describe('useChartPerformance', () => {
  it('should initialize with default metrics', () => {
    const { result } = renderHook(() => useChartPerformance());

    expect(result.current.metrics).toEqual({
      renderTime: 0,
      dataProcessingTime: 0,
      totalUpdateTime: 0,
      memoryUsage: 0,
      frameRate: 0,
      lastRenderTimestamp: 0,
    });
    expect(result.current.isTracking).toBe(false);
  });

  it('should start tracking when startTracking is called', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    expect(result.current.isTracking).toBe(true);
  });

  it('should stop tracking when stopTracking is called', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    expect(result.current.isTracking).toBe(true);

    act(() => {
      result.current.stopTracking();
    });

    expect(result.current.isTracking).toBe(false);
  });

  it('should record data processing time correctly', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    const startTime = 1000;
    mockTime = 1025; // 25ms later

    act(() => {
      result.current.recordDataProcessing(startTime);
    });

    expect(result.current.metrics.dataProcessingTime).toBe(25);
    expect(result.current.metrics.lastRenderTimestamp).toBe(1025);
  });

  it('should record render time correctly', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    const startTime = 1000;
    mockTime = 1050; // 50ms later

    act(() => {
      result.current.recordRender(startTime);
    });

    expect(result.current.metrics.renderTime).toBe(50);
    expect(result.current.metrics.lastRenderTimestamp).toBe(1050);
  });

  it('should calculate total update time correctly', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    // Record data processing time first
    mockTime = 1025;
    act(() => {
      result.current.recordDataProcessing(1000);
    });

    // Then record render time
    mockTime = 1075;
    act(() => {
      result.current.recordRender(1050);
    });

    expect(result.current.metrics.dataProcessingTime).toBe(25);
    expect(result.current.metrics.renderTime).toBe(25);
    expect(result.current.metrics.totalUpdateTime).toBe(50);
  });

  it('should reset metrics correctly', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
      result.current.recordRender(1000);
    });

    // Verify metrics have values
    expect(result.current.metrics.renderTime).toBeGreaterThan(0);

    act(() => {
      result.current.resetMetrics();
    });

    expect(result.current.metrics).toEqual({
      renderTime: 0,
      dataProcessingTime: 0,
      totalUpdateTime: 0,
      memoryUsage: 0,
      frameRate: 0,
      lastRenderTimestamp: 0,
    });
  });

  it('should not record metrics when not tracking', () => {
    const { result } = renderHook(() => useChartPerformance());

    // Don't start tracking
    act(() => {
      result.current.recordRender(1000);
    });

    expect(result.current.metrics.renderTime).toBe(0);
  });

  it('should provide average metrics', () => {
    const { result } = renderHook(() => useChartPerformance());

    act(() => {
      result.current.startTracking();
    });

    // Record multiple measurements
    mockTime = 1025;
    act(() => {
      result.current.recordRender(1000);
    });

    mockTime = 1055;
    act(() => {
      result.current.recordRender(1050);
    });

    const averageMetrics = result.current.getAverageMetrics();
    expect(averageMetrics.renderTime).toBe(12.5); // (25 + 5) / 2
  });
});