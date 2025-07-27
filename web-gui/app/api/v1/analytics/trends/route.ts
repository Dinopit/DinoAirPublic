import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { analyticsClient } from '@/lib/analytics/analytics-client';

async function getTrendAnalytics(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const metric = searchParams.get('metric') || 'all';
    const granularity = searchParams.get('granularity') || 'day';

    const currentData = await analyticsClient.getAdvancedAnalytics(timeframe);

    let previousData = null;
    try {
      previousData = await analyticsClient.getAdvancedAnalytics(timeframe);
    } catch (error) {
      console.warn('Could not get previous period data for trends:', error);
    }

    const trendData = {
      timeframe,
      granularity,
      metric,
      current: currentData,
      previous: previousData,
      trends: calculateTrends(currentData, previousData),
      forecasts: generateForecasts(currentData, timeframe),
      seasonality: analyzeSeasonality(currentData),
      anomalies: detectTrendAnomalies(currentData),
      insights: generateTrendInsights(currentData, previousData),
    };

    return NextResponse.json(trendData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Trend analytics error:', error);
    return NextResponse.json({ error: 'Failed to get trend analytics data' }, { status: 500 });
  }
}

function calculateTrends(current: any, previous: any) {
  if (!previous) {
    return {
      messages: { change: 0, changePercentage: 0, trend: 'stable' },
      sessions: { change: 0, changePercentage: 0, trend: 'stable' },
      responseTime: { change: 0, changePercentage: 0, trend: 'stable' },
      errorRate: { change: 0, changePercentage: 0, trend: 'stable' },
    };
  }

  const calculateChange = (currentVal: number, previousVal: number) => {
    const change = currentVal - previousVal;
    const changePercentage = previousVal > 0 ? (change / previousVal) * 100 : 0;
    const trend =
      changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable';
    return { change, changePercentage, trend };
  };

  return {
    messages: calculateChange(current.totalMessages, previous.totalMessages),
    sessions: calculateChange(current.totalSessions, previous.totalSessions),
    responseTime: calculateChange(
      current.responseTimeMetrics.avg,
      previous.responseTimeMetrics.avg
    ),
    errorRate: calculateChange(current.errorRate, previous.errorRate),
  };
}

function generateForecasts(data: any, _timeframe: string) {
  const dailyActivity = data.dailyActivity || [];
  if (dailyActivity.length < 3) {
    return {
      nextPeriod: {
        messages: data.totalMessages,
        sessions: data.totalSessions,
        confidence: 0.5,
      },
      longTerm: {
        messages: data.totalMessages,
        sessions: data.totalSessions,
        confidence: 0.3,
      },
    };
  }

  const recentPoints = dailyActivity.slice(-7);
  const trend =
    recentPoints.reduce((sum: number, point: any, index: number) => {
      return sum + point.value * (index + 1);
    }, 0) / recentPoints.reduce((sum: number, _: any, index: number) => sum + (index + 1), 0);

  const avgGrowth =
    trend /
    (recentPoints.reduce((sum: number, point: any) => sum + point.value, 0) / recentPoints.length);

  return {
    nextPeriod: {
      messages: Math.round(data.totalMessages * avgGrowth),
      sessions: Math.round(data.totalSessions * avgGrowth),
      confidence: 0.75,
    },
    longTerm: {
      messages: Math.round(data.totalMessages * Math.pow(avgGrowth, 4)),
      sessions: Math.round(data.totalSessions * Math.pow(avgGrowth, 4)),
      confidence: 0.45,
    },
  };
}

function analyzeSeasonality(data: any) {
  const hourlyActivity = data.hourlyActivity || [];
  const dailyActivity = data.dailyActivity || [];

  const peakHours = hourlyActivity
    .map((activity: any, hour: number) => ({ hour, activity: activity.value }))
    .sort((a: any, b: any) => b.activity - a.activity)
    .slice(0, 3);

  const peakDays = dailyActivity
    .slice(-7)
    .map((activity: any, day: number) => ({ day, activity: activity.value }))
    .sort((a: any, b: any) => b.activity - a.activity)
    .slice(0, 3);

  return {
    peakHours: peakHours.map((p: any) => p.hour),
    peakDays: peakDays.map((p: any) => p.day),
    patterns: {
      hourly: analyzePattern(hourlyActivity.map((h: any) => h.value)),
      daily: analyzePattern(dailyActivity.slice(-7).map((d: any) => d.value)),
      weekly: analyzePattern(dailyActivity.slice(-28).map((d: any) => d.value)),
    },
  };
}

function analyzePattern(values: number[]) {
  if (values.length < 2) return 'insufficient_data';

  const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev / avg < 0.2) return 'stable';
  if (stdDev / avg > 0.8) return 'highly_variable';
  return 'moderate_variation';
}

function detectTrendAnomalies(data: any) {
  const anomalies = [];
  const dailyActivity = data.dailyActivity || [];

  if (dailyActivity.length > 7) {
    const recent = dailyActivity.slice(-7);
    const previous = dailyActivity.slice(-14, -7);

    const recentAvg = recent.reduce((sum: number, d: any) => sum + d.value, 0) / recent.length;
    const previousAvg =
      previous.reduce((sum: number, d: any) => sum + d.value, 0) / previous.length;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (Math.abs(change) > 50) {
      anomalies.push({
        type: change > 0 ? 'spike' : 'drop',
        metric: 'daily_activity',
        severity: Math.abs(change) > 100 ? 'high' : 'medium',
        description: `Daily activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
        value: recentAvg,
        expectedValue: previousAvg,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (data.responseTimeMetrics.p95 > data.responseTimeMetrics.avg * 2.5) {
    anomalies.push({
      type: 'spike',
      metric: 'response_time',
      severity: 'high',
      description: 'P95 response time is significantly higher than average',
      value: data.responseTimeMetrics.p95,
      expectedValue: data.responseTimeMetrics.avg,
      timestamp: new Date().toISOString(),
    });
  }

  return anomalies;
}

function generateTrendInsights(
  current: any,
  previous: any
): Array<{
  type: 'growth' | 'decline' | 'degradation' | 'improvement';
  metric: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
}> {
  const insights: Array<{
    type: 'growth' | 'decline' | 'degradation' | 'improvement';
    metric: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    timestamp: string;
  }> = [];

  if (!previous) {
    return insights;
  }

  const messageGrowth =
    ((current.totalMessages - previous.totalMessages) / previous.totalMessages) * 100;
  if (Math.abs(messageGrowth) > 20) {
    insights.push({
      type: messageGrowth > 0 ? 'growth' : 'decline',
      metric: 'messages',
      description: `Message volume ${messageGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(messageGrowth).toFixed(1)}%`,
      impact: Math.abs(messageGrowth) > 50 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    });
  }

  const responseTimeChange =
    ((current.responseTimeMetrics.avg - previous.responseTimeMetrics.avg) /
      previous.responseTimeMetrics.avg) *
    100;
  if (Math.abs(responseTimeChange) > 15) {
    insights.push({
      type: responseTimeChange > 0 ? 'degradation' : 'improvement',
      metric: 'response_time',
      description: `Average response time ${responseTimeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(responseTimeChange).toFixed(1)}%`,
      impact: Math.abs(responseTimeChange) > 30 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    });
  }

  return insights;
}

export const GET = withApiAuth(getTrendAnalytics);
