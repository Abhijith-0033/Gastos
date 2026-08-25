import slugify from 'slugify';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { db } from '../database/db.js';

/**
 * Generate a unique URL slug from a name string
 */
export function generateUniqueSlug(name, tableName = 'apps', currentId = null) {
  let baseSlug = slugify(name, { lower: true, strict: true, trim: true });
  if (!baseSlug) baseSlug = `app-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = `SELECT id FROM ${tableName} WHERE slug = ?`;
    let params = [slug];

    if (currentId) {
      query += ' AND id != ?';
      params.push(currentId);
    }

    const existing = db.prepare(query).get(...params);
    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Process uploaded icon to 512x512 PNG format using Sharp
 */
export async function processAppIcon(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const parsed = path.parse(filePath);
  const outPath = path.join(parsed.dir, `processed-${parsed.name}.png`);

  try {
    await sharp(filePath)
      .resize(512, 512, { fit: 'cover', position: 'center' })
      .png({ quality: 90 })
      .toFile(outPath);

    // Remove original uploaded raw file
    fs.unlinkSync(filePath);
    return `/uploads/icons/${path.basename(outPath)}`;
  } catch (err) {
    console.error('Sharp icon processing error:', err);
    // Fallback to original
    return `/uploads/icons/${path.basename(filePath)}`;
  }
}

/**
 * Process uploaded banner to 1024x500 WebP format
 */
export async function processBanner(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const parsed = path.parse(filePath);
  const outPath = path.join(parsed.dir, `processed-${parsed.name}.webp`);

  try {
    await sharp(filePath)
      .resize(1024, 500, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(outPath);

    fs.unlinkSync(filePath);
    return `/uploads/banners/${path.basename(outPath)}`;
  } catch (err) {
    console.error('Sharp banner processing error:', err);
    return `/uploads/banners/${path.basename(filePath)}`;
  }
}

/**
 * Log admin activity to audit log
 */
export function logAdminAction(adminId, actionType, targetType, targetId, details = {}) {
  try {
    db.prepare(`
      INSERT INTO admin_action_logs (admin_id, action_type, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, actionType, targetType, targetId, JSON.stringify(details));
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

/**
 * Create an in-app notification for a user
 */
export function createNotification(userId, title, body, type = 'info', data = {}) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, body, type, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Recalculate average rating and total reviews for an app
 */
export function recalculateAppRating(appId) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(AVG(rating), 0.0) as avg
    FROM reviews
    WHERE app_id = ? AND status = 'approved'
  `).get(appId);

  const roundedAvg = Math.round(stats.avg * 10) / 10;

  db.prepare(`
    UPDATE apps
    SET average_rating = ?, total_reviews = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(roundedAvg, stats.count, appId);
}
