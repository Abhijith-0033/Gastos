import slugify from 'slugify';
import { queryOne, queryRun } from '../database/db.js';

/**
 * Generate a unique URL slug from a name string
 */
export async function generateUniqueSlug(name, tableName = 'apps', currentId = null) {
  let baseSlug = slugify(name, { lower: true, strict: true, trim: true });
  if (!baseSlug) baseSlug = `app-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = `SELECT id FROM ${tableName} WHERE slug = $1`;
    let params = [slug];

    if (currentId) {
      query += ' AND id != $2';
      params.push(currentId);
    }

    const existing = await queryOne(query, params);
    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Process uploaded icon (With Cloudinary, multer storage uploads directly to Cloudinary)
 */
export async function processAppIcon(filePathOrUrl) {
  if (!filePathOrUrl) return null;
  return filePathOrUrl;
}

/**
 * Process uploaded banner
 */
export async function processBanner(filePathOrUrl) {
  if (!filePathOrUrl) return null;
  return filePathOrUrl;
}

/**
 * Log admin activity to audit log
 */
export async function logAdminAction(adminId, actionType, targetType, targetId, details = {}) {
  try {
    await queryRun(
      `INSERT INTO admin_action_logs (admin_id, action_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, actionType, targetType, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(userId, title, body, type = 'info', data = {}) {
  try {
    await queryRun(
      `INSERT INTO notifications (user_id, title, body, type, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, body, type, JSON.stringify(data)]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Recalculate average rating and total reviews for an app
 */
export async function recalculateAppRating(appId) {
  try {
    const stats = await queryOne(
      `SELECT
        COUNT(*)::int as count,
        COALESCE(AVG(rating), 0.0) as avg
       FROM reviews
       WHERE app_id = $1 AND status = 'approved'`,
      [appId]
    );

    const count = stats ? Number(stats.count) : 0;
    const roundedAvg = stats ? Math.round(Number(stats.avg) * 10) / 10 : 0.0;

    await queryRun(
      `UPDATE apps
       SET average_rating = $1, total_reviews = $2, updated_at = NOW()
       WHERE id = $3`,
      [roundedAvg, count, appId]
    );
  } catch (err) {
    console.error('Failed to recalculate app rating:', err);
  }
}
