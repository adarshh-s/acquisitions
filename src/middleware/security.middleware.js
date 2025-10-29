import aj from '#config/arcjet.js';
import { slidingWindow } from '@arcjet/node';
import logger from '#config/logger.js';

const securityMiddleware = async (req, res, next) => {
  // IMMEDIATELY bypass in non-production - check at the very top
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv !== 'production') {
    logger.info('Bypassing security middleware (NODE_ENV: ' + nodeEnv + ')');
    return next();
  }

  try {
    // Whitelist legitimate tools (only runs in production)
    const userAgent = req.get('User-Agent') || '';
    const whitelistedUserAgents = [
      'PostmanRuntime',
      'insomnia',
      'Thunder Client',
      'HTTPie',
      'curl',
      'axios',
      'node-fetch',
    ];

    const isWhitelisted = whitelistedUserAgents.some(agent =>
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );

    if (isWhitelisted) {
      logger.info('Whitelisted user agent detected, bypassing checks', {
        userAgent,
      });
      return next();
    }

    const role = req.user?.role || 'guest';

    let limit;
    let message;

    switch (role) {
      case 'admin':
        limit = 20;
        message = 'Admin request limit exceeded (20 per minute). Slow down!';
        break;
      case 'user':
        limit = 10;
        message = 'User request limit exceeded (10 per minute). Slow down!';
        break;
      case 'guest':
        limit = 5;
        message = 'Guest request limit exceeded (5 per minute). Slow down!';
        break;
      default:
        limit = 5;
        message = 'Request limit exceeded. Slow down!';
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );

    const decision = await client.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isBot) {
        logger.warn('Bot request blocked', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Automated requests are not allowed',
        });
      }

      if (decision.reason.isShield) {
        logger.warn('Shield blocked request', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Request blocked by security policy',
        });
      }

      if (decision.reason.isRateLimit) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          role,
        });
        return res.status(429).json({
          error: 'Too Many Requests',
          message,
        });
      }
    }

    next();
  } catch (e) {
    logger.error('Arcjet middleware error:', {
      error: e.message,
      stack: e.stack,
      path: req.path,
    });

    // Always continue on error to avoid breaking the app
    next();
  }
};

export default securityMiddleware;
