// User routes for Supabase integration
const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/db');

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const { user, error } = await auth.getCurrentUser();

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

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userData = await db.getUserById(req.user.id);

    if (!userData) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.status(200).json({ profile: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, bio, preferences } = req.body;

    // Only update provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (preferences !== undefined) updates.preferences = preferences;

    const updatedUser = await db.updateUser(req.user.id, updates);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ profile: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user chat history
router.get('/chat-history', requireAuth, async (req, res) => {
  try {
    const chatHistory = await db.getUserChatHistory(req.user.id);
    return res.status(200).json({ chatHistory });
  } catch (error) {
    console.error('Get chat history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
