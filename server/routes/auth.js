const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email and populate business units
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('businessUnits', 'code name')
      .populate('defaultBusinessUnit', 'code name');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60)); // minutes
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
        lockTimeRemaining: lockTimeRemaining
      });
    }

    // Check if user is active (not inactive or locked)
    if (user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      // Refresh user data to get updated login attempts
      const updatedUser = await User.findById(user._id);
      
      let message = 'Invalid email or password';
      if (updatedUser.status === 'locked') {
        message = 'Account has been locked due to multiple failed login attempts. Please try again in 30 minutes.';
      } else {
        const attemptsLeft = 5 - updatedUser.loginAttempts;
        if (attemptsLeft > 0) {
          message = `Invalid email or password. ${attemptsLeft} attempts remaining before account lock.`;
        }
      }
      
      return res.status(401).json({
        success: false,
        message: message,
        attemptsLeft: Math.max(0, 5 - updatedUser.loginAttempts)
      });
    }

    // Successful login - reset login attempts
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Create response user object (exclude password)
    const userResponse = {
      _id: user._id,
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      businessUnits: user.businessUnits,
      defaultBusinessUnit: user.defaultBusinessUnit,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent'
      });
    }

    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Save it to the database with expiration
    // 3. Send email with reset link
    // 4. For now, we'll just log it and return success

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log(`Password reset requested for ${email}. Reset token: ${resetToken}`);

    // TODO: Implement email sending service
    // await sendPasswordResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing request'
    });
  }
});

// Reset password endpoint (for future implementation)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // TODO: Implement token validation and password reset
    // 1. Find user by valid, non-expired reset token
    // 2. Hash new password
    // 3. Update user password
    // 4. Invalidate reset token

    res.status(501).json({
      success: false,
      message: 'Password reset functionality not implemented yet'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing request'
    });
  }
});

// Logout endpoint (for session-based auth in the future)
router.post('/logout', async (req, res) => {
  try {
    // For now, just return success since we're using client-side auth
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Verify user endpoint (for checking if user is still valid)
router.get('/verify', async (req, res) => {
  try {
    // TODO: Implement JWT token verification when we add proper authentication
    res.status(501).json({
      success: false,
      message: 'Token verification not implemented yet'
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

// Unlock account endpoint (admin only)
router.post('/unlock-account', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset login attempts and unlock account
    await user.resetLoginAttempts();

    res.json({
      success: true,
      message: 'Account has been unlocked successfully'
    });

  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during account unlock'
    });
  }
});

// Get login status endpoint
router.get('/login-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const status = {
      email: user.email,
      status: user.status,
      isLocked: user.isLocked,
      loginAttempts: user.loginAttempts || 0,
      lockUntil: user.lockUntil,
      attemptsRemaining: Math.max(0, 5 - (user.loginAttempts || 0))
    };

    if (user.isLocked && user.lockUntil) {
      status.lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60)); // minutes
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Login status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting login status'
    });
  }
});

module.exports = router;
