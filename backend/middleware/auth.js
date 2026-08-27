import jwt from 'jsonwebtoken';
import { queryOne } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gastos_appstore_super_secret_jwt_key_2026_change_in_production';

/**
 * Authenticate JWT token and attach user to req.user
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await queryOne('SELECT id, username, email, role, display_name, is_active FROM users WHERE id = $1', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been suspended. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Optional authentication: attaches user if token is present, but allows guest
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await queryOne('SELECT id, username, email, role, display_name, is_active FROM users WHERE id = $1', [decoded.id]);
      if (user && user.is_active) {
        req.user = user;
      }
    } catch {
      // Ignore invalid token on optional auth
    }
  }
  next();
}

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles - Allowed roles, e.g. requireRole('admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}
