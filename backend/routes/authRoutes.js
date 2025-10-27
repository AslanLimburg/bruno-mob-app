const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const passport = require('passport');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/me', authMiddleware, AuthController.getMe);
router.delete('/delete-account', authMiddleware, AuthController.deleteAccount);

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/google/failure',
    session: false 
  }),
  AuthController.googleAuthSuccess
);

router.get('/google/failure', AuthController.googleAuthFailure);

module.exports = router;
