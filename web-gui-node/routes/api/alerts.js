const express = require('express');
const { AlertingManager } = require('../../lib/alerting');
const { rateLimits } = require('../../middleware/validation');
const { createSpan, getCorrelationId } = require('../../lib/apm');
const router = express.Router();

const alertingManager = new AlertingManager();

router.get('/status', rateLimits.api, (req, res) => {
  const correlationId = getCorrelationId(req);
  
  const status = {
    enabled: true,
    timestamp: new Date().toISOString(),
    correlationId,
    configuration: {
      webhookConfigured: Boolean(process.env.ALERT_WEBHOOK_URL),
      slackConfigured: Boolean(process.env.ALERT_SLACK_WEBHOOK_URL),
      emailConfigured: process.env.ALERT_EMAIL_ENABLED === 'true'
    },
    thresholds: alertingManager.config.thresholds,
    recentAlerts: Array.from(alertingManager.alertHistory.entries()).map(([key, timestamp]) => ({
      alert: key,
      lastSent: new Date(timestamp).toISOString(),
      cooldownRemaining: Math.max(0, alertingManager.cooldownPeriod - (Date.now() - timestamp))
    }))
  };

  res.json(status);
});

router.post('/test', rateLimits.api, async (req, res) => {
  const span = createSpan('alerts_test', {
    attributes: {
      'correlation.id': getCorrelationId(req)
    }
  });

  try {
    const { severity = 'info', component = 'test', message = 'Test alert from DinoAir' } = req.body;

    await alertingManager.sendAlert({
      severity,
      component,
      type: 'test-alert',
      message,
      description: 'This is a test alert to verify the alerting system is working correctly.',
      metrics: {
        testTimestamp: Date.now(),
        requestedBy: 'api-test'
      }
    });

    if (span) {
      span.setAttributes({
        'alert.test.severity': severity,
        'alert.test.component': component
      });
      span.end();
    }

    res.json({
      success: true,
      message: 'Test alert sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (span) {
      span.recordException(error);
      span.end();
    }
    
    console.error('Test alert failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert',
      message: error.message
    });
  }
});

router.get('/config', rateLimits.api, (req, res) => {
  const config = {
    thresholds: alertingManager.config.thresholds,
    cooldownPeriod: alertingManager.cooldownPeriod,
    channels: {
      webhook: {
        enabled: Boolean(process.env.ALERT_WEBHOOK_URL),
        url: process.env.ALERT_WEBHOOK_URL ? '[CONFIGURED]' : null
      },
      slack: {
        enabled: process.env.ALERT_SLACK_ENABLED === 'true',
        channel: process.env.ALERT_SLACK_CHANNEL || '#alerts',
        webhookConfigured: Boolean(process.env.ALERT_SLACK_WEBHOOK_URL)
      },
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        smtpHost: process.env.ALERT_SMTP_HOST || null,
        from: process.env.ALERT_EMAIL_FROM || null,
        to: process.env.ALERT_EMAIL_TO || null
      }
    }
  };

  res.json(config);
});

module.exports = router;
