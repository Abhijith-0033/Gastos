import rateLimit from 'express-rate-limit';

// Standard rate limiter for all public endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes per IP
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication routes (login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Download limiter to prevent flood downloading
export const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 downloads per minute per IP
  message: { error: 'Download rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Review submission limiter
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reviews per hour per IP
  message: { error: 'You are submitting reviews too quickly. Please wait before posting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
