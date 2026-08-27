import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { queryOne, queryRun } from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';
import { reviewLimiter } from '../middleware/rateLimiter.js';
import { recalculateAppRating, createNotification } from '../utils/helpers.js';

const router = Router();

/**
 * POST /api/v1/reviews/:appSlug
 * Submit a review for an app
 */
router.post(
  '/:appSlug',
  reviewLimiter,
  optionalAuth,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .toInt()
      .withMessage('Rating must be an integer between 1 and 5'),
    body('reviewer_name')
      .trim()
      .notEmpty()
      .withMessage('Reviewer name is required')
      .isLength({ max: 50 })
      .withMessage('Name too long (max 50 chars)'),
    body('reviewer_email')
      .optional({ checkFalsy: true })
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title too long (max 100 chars)'),
    body('body')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Review body too long (max 1000 chars)'),
    body('device_info')
      .optional()
      .trim()
      .isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { appSlug } = req.params;
      const { rating, reviewer_name, reviewer_email, title, body: reviewBody, device_info } = req.body;
      const numRating = Number(rating);

      const app = await queryOne("SELECT id, name, developer_id FROM apps WHERE slug = $1 AND status = 'approved'", [appSlug]);
      if (!app) {
        return res.status(404).json({ error: 'App not found or not published.' });
      }

      const userId = req.user?.id || null;
      const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || null;

      // Check if verified download
      let isVerifiedDownload = 0;
      if (userId) {
        const dl = await queryOne('SELECT id FROM download_logs WHERE app_id = $1 AND user_id = $2', [app.id, userId]);
        if (dl) isVerifiedDownload = 1;
      } else if (ip) {
        const dl = await queryOne('SELECT id FROM download_logs WHERE app_id = $1 AND ip_address = $2', [app.id, ip]);
        if (dl) isVerifiedDownload = 1;
      }

      // Check store setting for auto-approve vs pending moderation
      const settingRow = await queryOne("SELECT value FROM store_settings WHERE key = 'require_review_approval'");
      const requireApproval = settingRow?.value === 'true';
      const status = requireApproval ? 'pending' : 'approved';

      const result = await queryOne(
        `INSERT INTO reviews (
          app_id, user_id, reviewer_name, reviewer_email,
          rating, title, body, device_info, is_verified_download, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          app.id,
          userId,
          reviewer_name,
          reviewer_email || null,
          numRating,
          title || null,
          reviewBody || null,
          device_info || null,
          isVerifiedDownload,
          status,
        ]
      );

      // If auto-approved, recalculate rating now
      if (status === 'approved') {
        await recalculateAppRating(app.id);
      }

      // Notify developer about the review
      await createNotification(
        app.developer_id,
        `New ${numRating}★ Review for ${app.name}`,
        `"${reviewer_name}" gave your app ${numRating} stars: "${title || reviewBody?.slice(0, 40) || 'No text'}"`,
        'new_review',
        { app_id: app.id, review_id: Number(result.id) }
      );

      return res.status(201).json({
        message: status === 'approved' ? 'Thank you! Your review has been published.' : 'Thank you! Your review has been submitted for moderation.',
        review_id: Number(result.id),
        status,
      });
    } catch (err) {
      console.error('Review submission error:', err);
      return res.status(500).json({ error: 'Failed to submit review: ' + err.message });
    }
  }
);

/**
 * POST /api/v1/reviews/:id/helpful
 * Upvote review helpfulness
 */
router.post('/:id/helpful', async (req, res) => {
  try {
    const reviewId = Number(req.params.id);

    const review = await queryOne('SELECT id, helpful_count FROM reviews WHERE id = $1', [reviewId]);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await queryRun('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1', [reviewId]);

    return res.json({
      message: 'Marked as helpful',
      helpful_count: Number(review.helpful_count) + 1,
    });
  } catch (err) {
    console.error('Review helpful error:', err);
    return res.status(500).json({ error: 'Failed to record vote: ' + err.message });
  }
});

export default router;
