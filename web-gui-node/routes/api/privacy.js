const express = require('express');
const router = express.Router();
const auth = require('../../lib/auth');
const { ConsentManager } = require('../../lib/consent');
const { DataRetentionManager } = require('../../lib/data-retention');
const db = require('../../lib/db');
const { supabaseAdmin } = require('../../lib/supabase');
const { rateLimits, sanitizeInput } = require('../../middleware/validation');
const { body, validationResult } = require('express-validator');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

router.get('/export', rateLimits.api, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const format = req.query.format || 'complete';

    const userData = await db.getUserById(userId);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: chatSessions, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
    }

    const sessionIds = chatSessions?.map(session => session.id) || [];
    let chatMessages = [];
    let chatMetrics = [];

    if (sessionIds.length > 0) {
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching chat messages:', messagesError);
      } else {
        chatMessages = messages || [];
      }

      const { data: metrics, error: metricsError } = await supabaseAdmin
        .from('chat_metrics')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (metricsError) {
        console.error('Error fetching chat metrics:', metricsError);
      } else {
        chatMetrics = metrics || [];
      }
    }

    const { data: consentPrefs, error: consentError } = await supabaseAdmin
      .from('consent_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (consentError && consentError.code !== 'PGRST116') {
      console.error('Error fetching consent preferences:', consentError);
    }

    const { data: apiKeys, error: apiKeysError } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, created_at, last_used_at')
      .eq('user_id', userId);

    if (apiKeysError) {
      console.error('Error fetching API keys:', apiKeysError);
    }

    const exportData = {
      export_metadata: {
        timestamp: new Date().toISOString(),
        user_id: userId,
        export_type: format,
        version: '1.0'
      },
      user_profile: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        bio: userData.bio,
        preferences: userData.preferences,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      },
      chat_data: {
        sessions: chatSessions || [],
        messages: chatMessages,
        metrics: chatMetrics
      },
      consent_preferences: consentPrefs || {
        essential: true,
        analytics: false,
        improvements: false
      },
      api_keys: (apiKeys || []).map(key => ({
        id: key.id,
        name: key.name,
        created_at: key.created_at,
        last_used_at: key.last_used_at
      }))
    };

    if (format === 'portable') {
      const portableData = {
        user_profile: exportData.user_profile,
        chat_sessions: exportData.chat_data.sessions,
        chat_messages: exportData.chat_data.messages,
        preferences: exportData.user_profile.preferences,
        consent_preferences: exportData.consent_preferences
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dinoair-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(portableData);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dinoair-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);

  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.delete('/delete', 
  rateLimits.auth,
  requireAuth,
  sanitizeInput,
  [
    body('confirmEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email confirmation is required'),
    body('deleteType')
      .isIn(['conversations', 'all'])
      .withMessage('Delete type must be conversations or all'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { confirmEmail, deleteType } = req.body;

      const userData = await db.getUserById(userId);
      if (!userData || userData.email !== confirmEmail) {
        return res.status(400).json({ error: 'Email confirmation does not match' });
      }

      if (deleteType === 'conversations') {
        const { data: sessions, error: sessionsError } = await supabaseAdmin
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId);

        if (sessionsError) {
          throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
        }

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);

          const { error: metricsError } = await supabaseAdmin
            .from('chat_metrics')
            .delete()
            .in('session_id', sessionIds);

          if (metricsError) {
            console.error('Error deleting chat metrics:', metricsError);
          }

          const { error: messagesError } = await supabaseAdmin
            .from('chat_messages')
            .delete()
            .in('session_id', sessionIds);

          if (messagesError) {
            throw new Error(`Failed to delete messages: ${messagesError.message}`);
          }

          const { error: sessionsDeleteError } = await supabaseAdmin
            .from('chat_sessions')
            .delete()
            .eq('user_id', userId);

          if (sessionsDeleteError) {
            throw new Error(`Failed to delete sessions: ${sessionsDeleteError.message}`);
          }
        }

        return res.json({ 
          message: 'All conversations deleted successfully',
          deletedItems: ['chat_sessions', 'chat_messages', 'chat_metrics']
        });

      } else if (deleteType === 'all') {
        const { data: sessions, error: sessionsError } = await supabaseAdmin
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId);

        if (!sessionsError && sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);

          await supabaseAdmin.from('chat_metrics').delete().in('session_id', sessionIds);
          await supabaseAdmin.from('chat_messages').delete().in('session_id', sessionIds);
          await supabaseAdmin.from('chat_sessions').delete().eq('user_id', userId);
        }

        await supabaseAdmin.from('consent_preferences').delete().eq('user_id', userId);
        await supabaseAdmin.from('api_keys').delete().eq('user_id', userId);

        const { error: userDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);

        if (userDeleteError) {
          throw new Error(`Failed to delete user: ${userDeleteError.message}`);
        }

        const { error: authDeleteError } = await auth.deleteUser(userId);
        if (authDeleteError) {
          console.error('Error deleting auth user:', authDeleteError);
        }

        return res.json({ 
          message: 'Account and all data deleted successfully',
          deletedItems: ['user_profile', 'chat_data', 'consent_preferences', 'api_keys', 'auth_account']
        });
      }

    } catch (error) {
      console.error('Data deletion error:', error);
      res.status(500).json({ error: 'Failed to delete data' });
    }
  }
);

router.get('/consent', rateLimits.api, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: consent, error } = await supabaseAdmin
      .from('consent_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const defaultConsent = {
      essential: true,
      analytics: false,
      improvements: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(consent || defaultConsent);
  } catch (error) {
    console.error('Error fetching consent preferences:', error);
    res.status(500).json({ error: 'Failed to fetch consent preferences' });
  }
});

router.put('/consent',
  rateLimits.api,
  requireAuth,
  sanitizeInput,
  [
    body('essential')
      .isBoolean()
      .withMessage('Essential consent must be a boolean'),
    body('analytics')
      .isBoolean()
      .withMessage('Analytics consent must be a boolean'),
    body('improvements')
      .isBoolean()
      .withMessage('Improvements consent must be a boolean'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { essential, analytics, improvements } = req.body;

      if (!essential) {
        return res.status(400).json({ 
          error: 'Essential consent is required for service functionality' 
        });
      }

      const consentData = {
        user_id: userId,
        essential,
        analytics,
        improvements,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('consent_preferences')
        .upsert(consentData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        message: 'Consent preferences updated successfully',
        preferences: data
      });
    } catch (error) {
      console.error('Error updating consent preferences:', error);
      res.status(500).json({ error: 'Failed to update consent preferences' });
    }
  }
);

router.get('/data-summary', rateLimits.api, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: sessionCount } = await supabaseAdmin
      .from('chat_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: messageCount } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .in('session_id', 
        supabaseAdmin
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
      );

    const { data: apiKeyCount } = await supabaseAdmin
      .from('api_keys')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: oldestSession } = await supabaseAdmin
      .from('chat_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    const summary = {
      chat_sessions: sessionCount?.length || 0,
      chat_messages: messageCount?.length || 0,
      api_keys: apiKeyCount?.length || 0,
      account_age_days: oldestSession?.[0]?.created_at 
        ? Math.floor((new Date() - new Date(oldestSession[0].created_at)) / (1000 * 60 * 60 * 24))
        : 0,
      data_retention: {
        chat_sessions: '2 years',
        performance_metrics: '1 year',
        api_logs: '6 months',
        user_preferences: 'Until account deletion'
      }
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching data summary:', error);
    res.status(500).json({ error: 'Failed to fetch data summary' });
  }
});

module.exports = router;
