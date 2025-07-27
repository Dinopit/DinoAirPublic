/**
 * Page Routes
 * Handles all frontend page rendering
 */

const express = require('express');
const router = express.Router();

// Home page - Main chat interface
router.get('/', (req, res) => {
  res.render('index', {
    title: 'DinoAir - AI Chat Interface',
    pageTitle: 'DinoAir Chat',
    description: 'Chat with AI models using DinoAir',
    currentPage: 'chat'
  });
});

// Chat page (alias for home)
router.get('/chat', (req, res) => {
  res.redirect('/');
});

// DinoAir GUI main interface
router.get('/dinoair-gui', (req, res) => {
  res.render('dinoair-gui', {
    title: 'DinoAir GUI - Main Interface',
    pageTitle: 'DinoAir GUI',
    description: 'DinoAir main graphical interface',
    currentPage: 'gui'
  });
});

// Artifacts page
router.get('/artifacts', (req, res) => {
  res.render('artifacts', {
    title: 'DinoAir - Artifacts',
    pageTitle: 'Artifacts Management',
    description: 'Manage and export your AI-generated artifacts',
    currentPage: 'artifacts'
  });
});

// Models page
router.get('/models', (req, res) => {
  res.render('models', {
    title: 'DinoAir - Models',
    pageTitle: 'AI Models',
    description: 'Manage AI models and configurations',
    currentPage: 'models'
  });
});

// Personalities page
router.get('/personalities', (req, res) => {
  res.render('personalities', {
    title: 'DinoAir - Personalities',
    pageTitle: 'AI Personalities',
    description: 'Manage AI personalities and system prompts',
    currentPage: 'personalities'
  });
});

// API Documentation page
router.get('/api-docs', (req, res) => {
  res.render('api-docs', {
    title: 'DinoAir - API Documentation',
    pageTitle: 'API Documentation',
    description: 'DinoAir API documentation and testing interface',
    currentPage: 'docs'
  });
});

// Health status page
router.get('/health', (req, res) => {
  res.render('health', {
    title: 'DinoAir - System Health',
    pageTitle: 'System Health',
    description: 'System health monitoring and diagnostics',
    currentPage: 'health'
  });
});

// Settings page
router.get('/settings', (req, res) => {
  res.render('settings', {
    title: 'DinoAir - Settings',
    pageTitle: 'Settings',
    description: 'Application settings and configuration',
    currentPage: 'settings'
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'DinoAir - About',
    pageTitle: 'About DinoAir',
    description: 'About DinoAir AI chat interface',
    currentPage: 'about'
  });
});

module.exports = router;
