/**
 * Export Progress API Routes
 * Server-Sent Events (SSE) for real-time export progress tracking
 */

const express = require('express');
const { streamingExportService } = require('../../../lib/streaming-export');
const { requireAuth } = require('../../../middleware/auth-middleware');
const { rateLimits } = require('../../../middleware/validation');

const router = express.Router();

// Store active SSE connections
const activeConnections = new Map();

/**
 * SSE endpoint for real-time progress tracking
 * GET /api/v1/export-progress/stream/:jobId
 */
router.get('/stream/:jobId', requireAuth, rateLimits.export, (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id;

  // Verify job exists and user has access
  const jobStatus = streamingExportService.getJobStatus(jobId);
  if (!jobStatus) {
    return res.status(404).json({
      success: false,
      error: 'Export job not found'
    });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Send initial status
  const initialData = {
    type: 'status',
    data: jobStatus,
    timestamp: new Date().toISOString()
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Store connection
  const connectionId = `${jobId}-${Date.now()}`;
  activeConnections.set(connectionId, {
    response: res,
    jobId,
    userId,
    startTime: Date.now()
  });

  // Set up event listeners
  const progressHandler = (eventJobId, job) => {
    if (eventJobId === jobId) {
      const progressData = {
        type: 'progress',
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          totalItems: job.totalItems,
          processedItems: job.processedItems,
          totalSize: job.totalSize,
          processedSize: job.processedSize,
          estimatedTimeRemaining: streamingExportService.estimateTimeRemaining(job),
          updatedAt: job.updatedAt
        },
        timestamp: new Date().toISOString()
      };
      
      try {
        res.write(`data: ${JSON.stringify(progressData)}\n\n`);
      } catch (error) {
        console.error('Error sending progress update:', error);
        cleanup();
      }
    }
  };

  const completedHandler = (eventJobId, job) => {
    if (eventJobId === jobId) {
      const completedData = {
        type: 'completed',
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          downloadUrl: job.downloadUrl,
          fileSize: job.fileSize,
          fileHash: job.fileHash,
          completedAt: job.updatedAt
        },
        timestamp: new Date().toISOString()
      };
      
      try {
        res.write(`data: ${JSON.stringify(completedData)}\n\n`);
        res.write('event: close\ndata: Export completed\n\n');
      } catch (error) {
        console.error('Error sending completion update:', error);
      }
      
      cleanup();
    }
  };

  const failedHandler = (eventJobId, job) => {
    if (eventJobId === jobId) {
      const errorData = {
        type: 'error',
        data: {
          jobId: job.id,
          status: job.status,
          error: job.error,
          failedAt: job.updatedAt
        },
        timestamp: new Date().toISOString()
      };
      
      try {
        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.write('event: close\ndata: Export failed\n\n');
      } catch (error) {
        console.error('Error sending error update:', error);
      }
      
      cleanup();
    }
  };

  const cancelledHandler = (eventJobId, job) => {
    if (eventJobId === jobId) {
      const cancelledData = {
        type: 'cancelled',
        data: {
          jobId: job.id,
          status: job.status,
          cancelledAt: job.updatedAt
        },
        timestamp: new Date().toISOString()
      };
      
      try {
        res.write(`data: ${JSON.stringify(cancelledData)}\n\n`);
        res.write('event: close\ndata: Export cancelled\n\n');
      } catch (error) {
        console.error('Error sending cancellation update:', error);
      }
      
      cleanup();
    }
  };

  // Register event listeners
  streamingExportService.on('progress', progressHandler);
  streamingExportService.on('completed', completedHandler);
  streamingExportService.on('failed', failedHandler);
  streamingExportService.on('cancelled', cancelledHandler);

  // Cleanup function
  const cleanup = () => {
    streamingExportService.removeListener('progress', progressHandler);
    streamingExportService.removeListener('completed', completedHandler);
    streamingExportService.removeListener('failed', failedHandler);
    streamingExportService.removeListener('cancelled', cancelledHandler);
    activeConnections.delete(connectionId);
    
    try {
      res.end();
    } catch (error) {
      // Connection already closed
    }
  };

  // Handle client disconnect
  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('close', cleanup);

  // Send periodic heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeatInterval);
      cleanup();
    }
  }, 30000); // 30 seconds

  // Cleanup heartbeat on connection close
  res.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * Polling endpoint for progress tracking (fallback for SSE)
 * GET /api/v1/export-progress/poll/:jobId
 */
router.get('/poll/:jobId', requireAuth, rateLimits.export, (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id;

  try {
    const jobStatus = streamingExportService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    res.json({
      success: true,
      data: jobStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export progress',
      message: error.message
    });
  }
});

/**
 * Cancel an export job
 * POST /api/v1/export-progress/cancel/:jobId
 */
router.post('/cancel/:jobId', requireAuth, rateLimits.export, (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id;

  try {
    const jobStatus = streamingExportService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    const cancelled = streamingExportService.cancelJob(jobId);
    
    if (cancelled) {
      res.json({
        success: true,
        message: 'Export job cancelled successfully',
        data: {
          jobId,
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel export job',
        message: 'Job may already be completed or cancelled'
      });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel export job',
      message: error.message
    });
  }
});

/**
 * Get all active export jobs (admin/monitoring)
 * GET /api/v1/export-progress/jobs
 */
router.get('/jobs', requireAuth, rateLimits.export, (req, res) => {
  try {
    const jobs = streamingExportService.getAllJobs();
    
    res.json({
      success: true,
      data: {
        jobs,
        total: jobs.length,
        activeConnections: activeConnections.size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting active jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active jobs',
      message: error.message
    });
  }
});

/**
 * Download completed export file
 * GET /api/v1/export-progress/download/:jobId
 */
router.get('/download/:jobId', requireAuth, rateLimits.export, (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id;
  const range = req.headers.range;

  try {
    let downloadInfo;
    
    if (range) {
      // Handle range requests for resumable downloads
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      
      downloadInfo = streamingExportService.getPartialDownloadStream(jobId, start, end);
      
      if (!downloadInfo) {
        return res.status(404).json({
          success: false,
          error: 'Export file not found or not ready'
        });
      }
      
      // Set partial content headers
      res.status(206);
      res.setHeader('Content-Range', `bytes ${downloadInfo.range.start}-${downloadInfo.range.end}/${downloadInfo.range.total}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', downloadInfo.size);
    } else {
      // Handle full file download
      downloadInfo = streamingExportService.getDownloadStream(jobId);
      
      if (!downloadInfo) {
        return res.status(404).json({
          success: false,
          error: 'Export file not found or not ready'
        });
      }
      
      res.setHeader('Content-Length', downloadInfo.size);
    }

    // Set common headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('ETag', `"${downloadInfo.hash}"`);
    
    // Stream the file
    downloadInfo.stream.pipe(res);
    
    downloadInfo.stream.on('error', (error) => {
      console.error('Error streaming export file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream export file'
        });
      }
    });
    
  } catch (error) {
    console.error('Error downloading export file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to download export file',
        message: error.message
      });
    }
  }
});

// Cleanup connections on server shutdown
process.on('SIGTERM', () => {
  console.log('Cleaning up SSE connections...');
  for (const [connectionId, connection] of activeConnections) {
    try {
      connection.response.write('event: close\ndata: Server shutting down\n\n');
      connection.response.end();
    } catch (error) {
      // Connection already closed
    }
  }
  activeConnections.clear();
});

module.exports = router;