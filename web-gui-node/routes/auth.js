// Authentication routes for Supabase integration
const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/db');
const { rateLimits, authValidation, sanitizeInput } = require('../middleware/validation');

// Sign up route
router.post('/signup', rateLimits.auth, sanitizeInput, authValidation.signup, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data, error } = await auth.signUpUser(email, password);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create user profile in database
    if (data?.user) {
      await db.createUser({
        id: data.user.id,
        email: data.user.email,
        name: name || email.split('@')[0], // Use part of email as name if not provided
        created_at: new Date().toISOString()
      });
    }

    return res.status(201).json({ 
      message: 'User created successfully',
      user: data?.user
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue creating your account. Please try again.',
      category: 'signup_error'
    });
  }
});

// Sign in route
router.post('/signin', rateLimits.auth, sanitizeInput, authValidation.signin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await auth.signInUser(email, password);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Set session cookie
    if (data?.session) {
      req.session.token = data.session.access_token;
      req.session.userId = data.user.id;
    }

    return res.status(200).json({ 
      message: 'Sign in successful',
      user: data?.user
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue signing you in. Please try again.',
      category: 'signin_error'
    });
  }
});

// Sign out route
router.post('/signout', async (req, res) => {
  try {
    const { error } = await auth.signOutUser();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Clear session
    req.session.destroy();

    return res.status(200).json({ message: 'Sign out successful' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue signing you out. Please try again.',
      category: 'signout_error'
    });
  }
});

// Get current user route
router.get('/me', async (req, res) => {
  try {
    const { user, error } = await auth.getCurrentUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get additional user data from database
    const userData = await db.getUserById(user.id);

    return res.status(200).json({ 
      user: {
        ...user,
        profile: userData
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue loading your profile. Please try again.',
      category: 'profile_error'
    });
  }
});

// Reset password request route
router.post('/reset-password', rateLimits.auth, sanitizeInput, authValidation.resetPassword, async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await auth.resetPassword(email);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue sending the password reset email. Please try again.',
      category: 'password_reset_error'
    });
  }
});

// Update password route
router.post('/update-password', rateLimits.auth, sanitizeInput, authValidation.updatePassword, async (req, res) => {
  try {
    const { password } = req.body;

    const { error } = await auth.updatePassword(password);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue updating your password. Please try again.',
      category: 'password_update_error'
    });
  }
});

// Create API key route (requires authentication)
router.post('/api-keys', rateLimits.auth, sanitizeInput, authValidation.createApiKey, async (req, res) => {
  try {
    const { user, error: authError } = await auth.getCurrentUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;

    const { apiKey, error } = await auth.createApiKey(user.id, name);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ apiKey });
  } catch (error) {
    console.error('Create API key error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue creating your API key. Please try again.',
      category: 'api_key_error'
    });
  }
});

module.exports = router;
