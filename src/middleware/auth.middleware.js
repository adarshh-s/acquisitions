import {jwttoken} from '#utils/jwt.js';
import logger from '#config/logger.js';

export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const decoded = jwttoken.verify(token);
    req.user = decoded;
    next();
  } catch (e) {
    logger.error('Authentication error:', e);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No user information found'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
};
