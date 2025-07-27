import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from './api-auth';

declare const process: any;

export function withAnalyticsAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return withApiAuth(async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const timeframe = searchParams.get('timeframe');
      
      const validTimeframes = ['1h', '24h', '7d', '30d', '90d'];
      if (timeframe && !validTimeframes.includes(timeframe)) {
        return NextResponse.json(
          { error: 'Invalid timeframe parameter' },
          { status: 400 }
        );
      }


      return await handler(request);
    } catch (error) {
      console.error('Analytics auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  });
}
