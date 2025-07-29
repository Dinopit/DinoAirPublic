import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCorrelationId } from '@/lib/correlation/correlation-id';
import { getLogger } from '@/lib/logging/logger';

const logger = getLogger('logs-api');

/**
 * Centralized logging endpoint for collecting logs from client-side
 */
export async function POST(request: NextRequest) {
  try {
    const { entries } = await request.json();
    
    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Invalid request: entries array required' },
        { status: 400 }
      );
    }

    // Log each entry with server context
    entries.forEach((entry: any) => {
      const logMessage = {
        source: 'client',
        clientTimestamp: entry.timestamp,
        serverTimestamp: new Date().toISOString(),
        correlationId: entry.correlationId || getCurrentCorrelationId(),
        level: entry.level,
        logger: entry.logger,
        message: entry.message,
        context: entry.context,
        error: entry.error,
        sessionId: entry.sessionId,
        userId: entry.userId,
        url: entry.url,
        userAgent: entry.userAgent
      };

      // Log based on level
      switch (entry.level) {
        case 0: // DEBUG
          logger.debug(`[CLIENT] ${entry.message}`, logMessage);
          break;
        case 1: // INFO
          logger.info(`[CLIENT] ${entry.message}`, logMessage);
          break;
        case 2: // WARN
          logger.warn(`[CLIENT] ${entry.message}`, logMessage);
          break;
        case 3: // ERROR
        case 4: // CRITICAL
          logger.error(`[CLIENT] ${entry.message}`, entry.error, logMessage);
          break;
        default:
          logger.info(`[CLIENT] ${entry.message}`, logMessage);
      }
    });

    // Return success response with correlation ID
    return NextResponse.json(
      { 
        success: true, 
        processed: entries.length,
        correlationId: getCurrentCorrelationId()
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error('Failed to process log entries', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process log entries',
        correlationId: getCurrentCorrelationId()
      },
      { status: 500 }
    );
  }
}