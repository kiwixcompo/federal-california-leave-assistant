const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireAccess, requireEmailVerification } = require('../middleware/auth');
const { getFederalResponse, getCaliforniaResponse } = require('../utils/aiService');

const router = express.Router();

// Federal Leave Assistant
router.post('/federal', [
  auth,
  requireEmailVerification,
  requireAccess,
  body('mode').isIn(['email', 'question']).withMessage('Mode must be email or question'),
  body('input').isLength({ min: 1 }).withMessage('Input is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mode, input } = req.body;
    const user = req.user;

    if (!user.openaiApiKey) {
      return res.status(400).json({ 
        message: 'OpenAI API key required. Please add it in your settings.',
        needsApiKey: true 
      });
    }

    const response = await getFederalResponse(mode, input, user.openaiApiKey);
    
    res.json({ response });
  } catch (error) {
    console.error('Federal AI error:', error);
    if (error.message.includes('API key')) {
      return res.status(400).json({ 
        message: 'Invalid OpenAI API key. Please check your settings.',
        needsApiKey: true 
      });
    }
    res.status(500).json({ message: 'AI service error' });
  }
});

// California Leave Assistant
router.post('/california', [
  auth,
  requireEmailVerification,
  requireAccess,
  body('mode').isIn(['email', 'question']).withMessage('Mode must be email or question'),
  body('input').isLength({ min: 1 }).withMessage('Input is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mode, input } = req.body;
    const user = req.user;

    if (!user.openaiApiKey) {
      return res.status(400).json({ 
        message: 'OpenAI API key required. Please add it in your settings.',
        needsApiKey: true 
      });
    }

    const response = await getCaliforniaResponse(mode, input, user.openaiApiKey);
    
    res.json({ response });
  } catch (error) {
    console.error('California AI error:', error);
    if (error.message.includes('API key')) {
      return res.status(400).json({ 
        message: 'Invalid OpenAI API key. Please check your se
        message: 'Invalid OpenAI API key. Please check your settings.',
        needsApiKey: true 
      });
    }
    res.status(500).json({ message: 'AI service error' });
  }
});

module.exports = router;