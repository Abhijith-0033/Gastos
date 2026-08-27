import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { queryOne, queryRun } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gastos_appstore_super_secret_jwt_key_2026_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/v1/auth/register
 * Register a new user/developer account
 */
router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain alphanumeric characters and underscores'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('display_name')
      .trim()
      .notEmpty()
      .withMessage('Display name is required'),
    body('role')
      .optional()
      .isIn(['developer', 'user'])
      .withMessage('Invalid role specified'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, display_name, role = 'developer', bio, website } = req.body;

      // Check existing username or email
      const existing = await queryOne('SELECT id, username, email FROM users WHERE username = $1 OR email = $2', [username, email]);
      if (existing) {
        if (existing.username.toLowerCase() === username.toLowerCase()) {
          return res.status(409).json({ error: 'Username is already taken.' });
        }
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const password_hash = bcrypt.hashSync(password, 10);

      const userRow = await queryOne(
        `INSERT INTO users (username, email, password_hash, role, display_name, bio, website)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [username, email, password_hash, role, display_name, bio || null, website || null]
      );

      const user = {
        id: userRow.id,
        username,
        email,
        role,
        display_name,
      };

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      res.status(201).json({
        message: 'Account created successfully!',
        token,
        user,
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to register account: ' + err.message });
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        website: user.website,
      };

      res.json({
        message: 'Logged in successfully',
        token,
        user: safeUser,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Failed to login: ' + err.message });
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get currently authenticated user details
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

/**
 * PUT /api/v1/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('display_name').optional().trim().notEmpty().withMessage('Display name cannot be empty'),
    body('bio').optional().trim(),
    body('website').optional().trim().isURL().withMessage('Must be a valid URL'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { display_name, bio, website } = req.body;

      await queryRun(
        `UPDATE users
         SET display_name = COALESCE($1, display_name),
             bio = COALESCE($2, bio),
             website = COALESCE($3, website),
             updated_at = NOW()
         WHERE id = $4`,
        [display_name || null, bio || null, website || null, req.user.id]
      );

      const updated = await queryOne('SELECT id, username, email, role, display_name, bio, website, avatar_url FROM users WHERE id = $1', [req.user.id]);
      res.json({ message: 'Profile updated', user: updated });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * GET /api/v1/auth/check-username?username=xyz
 * Check if username is available
 */
router.get('/check-username', async (req, res) => {
  try {
    const username = req.query.username?.toString().trim();
    if (!username || username.length < 3) {
      return res.json({ available: false, error: 'Username must be at least 3 characters' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE username ILIKE $1', [username]);
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ available: false, error: err.message });
  }
});

/**
 * GET /api/v1/auth/check-package?package_name=com.xyz
 * Check if package name is available
 */
router.get('/check-package', async (req, res) => {
  try {
    const pkg = req.query.package_name?.toString().trim();
    if (!pkg) {
      return res.json({ available: false, error: 'Package name required' });
    }

    const existing = await queryOne('SELECT id FROM apps WHERE package_name = $1', [pkg]);
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ available: false, error: err.message });
  }
});

export default router;
