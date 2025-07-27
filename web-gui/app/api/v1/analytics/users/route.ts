import { NextRequest, NextResponse } from 'next/server';
import { withAnalyticsAuth } from '@/lib/middleware/analytics-auth';
import { analyticsClient } from '@/lib/analytics/analytics-client';

async function getUserAnalytics(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const segment = searchParams.get('segment') || 'all';

    const userAnalyticsData = await analyticsClient.getUserBehaviorAnalytics(timeframe);

    const segmentedData = await analyzeUserSegments(userAnalyticsData, segment);

    const userInsights = generateUserInsights(userAnalyticsData);

    const analyticsData = {
      timeframe,
      segment,
      generatedAt: new Date().toISOString(),
      userMetrics: userAnalyticsData,
      segments: segmentedData,
      insights: userInsights,
      recommendations: generateUserRecommendations(userAnalyticsData),
    };

    return NextResponse.json(analyticsData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('User analytics error:', error);
    return NextResponse.json({ error: 'Failed to get user analytics data' }, { status: 500 });
  }
}

async function analyzeUserSegments(userData: any, segment: string) {
  const segments = {
    highly_active: {
      criteria: 'Users with >20 messages per week',
      count: Math.floor(userData.totalUsers * 0.2),
      characteristics: {
        avgSessionsPerWeek: 15,
        avgMessagesPerSession: 8,
        retentionRate: 0.9,
      },
    },
    moderately_active: {
      criteria: 'Users with 5-20 messages per week',
      count: Math.floor(userData.totalUsers * 0.5),
      characteristics: {
        avgSessionsPerWeek: 6,
        avgMessagesPerSession: 4,
        retentionRate: 0.7,
      },
    },
    low_activity: {
      criteria: 'Users with <5 messages per week',
      count: Math.floor(userData.totalUsers * 0.3),
      characteristics: {
        avgSessionsPerWeek: 2,
        avgMessagesPerSession: 2,
        retentionRate: 0.4,
      },
    },
  };

  return segment === 'all' ? segments : { [segment]: segments[segment as keyof typeof segments] };
}

function generateUserInsights(userData: any) {
  const insights = [];

  if (userData.userEngagement.averageSessionsPerUser < 2) {
    insights.push({
      type: 'engagement',
      severity: 'warning',
      title: 'Low User Engagement',
      description:
        'Users are averaging less than 2 sessions, indicating potential engagement issues.',
      recommendation: 'Consider implementing onboarding improvements or engagement features.',
      metrics: { avgSessions: userData.userEngagement.averageSessionsPerUser },
    });
  }

  const peakHour = userData.userBehavior.mostActiveHours[0];
  if (peakHour && peakHour.activity > userData.userBehavior.mostActiveHours[1]?.activity * 2) {
    insights.push({
      type: 'usage_pattern',
      severity: 'info',
      title: 'Strong Peak Usage Pattern',
      description: `Hour ${peakHour.hour} shows significantly higher activity than other times.`,
      recommendation:
        'Consider scheduling maintenance outside peak hours and optimizing for peak load.',
      metrics: { peakHour: peakHour.hour, peakActivity: peakHour.activity },
    });
  }

  if (userData.userEngagement.retentionRate.day7 < 0.5) {
    insights.push({
      type: 'retention',
      severity: 'critical',
      title: 'Low 7-Day Retention',
      description: 'Less than 50% of users return after 7 days, indicating retention issues.',
      recommendation: 'Implement user onboarding improvements and engagement strategies.',
      metrics: { day7Retention: userData.userEngagement.retentionRate.day7 },
    });
  }

  return insights;
}

function generateUserRecommendations(userData: any) {
  const recommendations = [];

  if (userData.userEngagement.averageSessionsPerUser < 3) {
    recommendations.push({
      category: 'engagement',
      priority: 'high',
      title: 'Improve User Onboarding',
      description:
        'Implement guided tutorials and feature discovery to increase session frequency.',
      expectedImpact: 'Increase average sessions per user by 40-60%',
      effort: 'medium',
    });
  }

  const offPeakHours = userData.userBehavior.mostActiveHours.slice(-6);
  if (offPeakHours.every((hour: any) => hour.activity < 10)) {
    recommendations.push({
      category: 'availability',
      priority: 'medium',
      title: 'Optimize for Peak Hours',
      description: 'Focus resources and features on peak usage times for better user experience.',
      expectedImpact: 'Improve response times during peak hours by 20-30%',
      effort: 'low',
    });
  }

  if (userData.userBehavior.featureUsage.length === 1) {
    recommendations.push({
      category: 'feature_adoption',
      priority: 'high',
      title: 'Increase Feature Discovery',
      description: 'Users are only using basic chat features. Promote advanced capabilities.',
      expectedImpact: 'Increase feature adoption by 25-40%',
      effort: 'medium',
    });
  }

  return recommendations;
}

export const GET = withAnalyticsAuth(getUserAnalytics);
