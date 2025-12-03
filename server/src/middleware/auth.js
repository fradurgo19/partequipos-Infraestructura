import { supabase } from '../index.js';

/**
 * Middleware to verify Supabase JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Attach user and profile to request
    req.user = user;
    req.profile = profile;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

