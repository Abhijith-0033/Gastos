import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';
import { downloadLimiter } from '../middleware/rateLimiter.js';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/v1/apps/featured
 * Get featured apps for homepage carousel
 */
router.get('/featured', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.tagline,
      a.icon_url, a.banner_url, a.average_rating, a.total_reviews,
      a.total_downloads, a.current_version,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'approved' AND a.is_featured = 1
    ORDER BY a.featured_order ASC, a.total_downloads DESC
    LIMIT 6
  `).all();

  res.json({ apps });
});

/**
 * GET /api/v1/apps/new-releases
 * Get latest released apps
 */
router.get('/new-releases', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.tagline,
      a.icon_url, a.average_rating, a.total_reviews,
      a.total_downloads, a.current_version, a.approved_at,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'approved'
    ORDER BY a.approved_at DESC, a.created_at DESC
    LIMIT 10
  `).all();

  res.json({ apps });
});

/**
 * GET /api/v1/apps/top-downloads
 * Get top downloaded apps
 */
router.get('/top-downloads', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.tagline,
      a.icon_url, a.average_rating, a.total_reviews,
      a.total_downloads, a.current_version,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'approved'
    ORDER BY a.total_downloads DESC
    LIMIT 10
  `).all();

  res.json({ apps });
});

/**
 * GET /api/v1/apps/editors-choice
 * Get Editor's Choice apps
 */
router.get('/editors-choice', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.tagline,
      a.icon_url, a.average_rating, a.total_reviews,
      a.total_downloads, a.current_version,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'approved' AND a.is_editors_choice = 1
    ORDER BY a.total_downloads DESC
    LIMIT 10
  `).all();

  res.json({ apps });
});

/**
 * GET /api/v1/apps/meta/categories
 * List all categories with published app counts
 */
router.get('/meta/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT
      c.id, c.name, c.slug, c.icon, c.description, c.sort_order,
      COUNT(a.id) as app_count
    FROM categories c
    LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'approved'
    GROUP BY c.id
    ORDER BY c.sort_order ASC
  `).all();

  res.json({ categories });
});

/**
 * GET /api/v1/apps/meta/search?q=xyz
 * Live search quick suggestions
 */
router.get('/meta/search', (req, res) => {
  const query = req.query.q?.toString().trim() || '';
  if (query.length < 2) {
    return res.json({ apps: [] });
  }

  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.icon_url, a.average_rating,
      c.name as category, u.display_name as developer_name
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'approved'
      AND (a.name LIKE ? OR a.tagline LIKE ? OR a.description LIKE ?)
    ORDER BY a.total_downloads DESC
    LIMIT 6
  `).all(`%${query}%`, `%${query}%`, `%${query}%`);

  res.json({ apps });
});

/**
 * GET /api/v1/apps
 * Paginated apps list with filter & sort options
 */
router.get('/', (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    sort = 'downloads',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ["a.status = 'approved'"];
  let params = [];

  if (category) {
    whereClauses.push('(c.slug = ? OR c.name = ?)');
    params.push(category, category);
  }

  if (search) {
    whereClauses.push('(a.name LIKE ? OR a.tagline LIKE ? OR a.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.join(' AND ');

  let orderBySql = 'a.total_downloads DESC';
  if (sort === 'rating') orderBySql = 'a.average_rating DESC, a.total_reviews DESC';
  else if (sort === 'newest') orderBySql = 'a.approved_at DESC, a.created_at DESC';
  else if (sort === 'name') orderBySql = 'a.name ASC';

  const countRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE ${whereSql}
  `).get(...params);

  const total = countRow.total;
  const totalPages = Math.ceil(total / limitNum);

  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.tagline,
      a.icon_url, a.banner_url, a.average_rating, a.total_reviews,
      a.total_downloads, a.current_version, a.apk_size_bytes,
      a.min_android_version, a.content_rating, a.is_featured, a.is_editors_choice,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE ${whereSql}
    ORDER BY ${orderBySql}
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    apps,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  });
});

/**
 * GET /api/v1/apps/:slug
 * Full details of a single app
 */
router.get('/:slug', (req, res) => {
  const slug = req.params.slug;

  const app = db.prepare(`
    SELECT
      a.*,
      c.name as category, c.slug as category_slug,
      u.display_name as developer_name, u.username as developer_username,
      u.bio as developer_bio, u.website as developer_website, u.created_at as developer_created_at
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.slug = ? AND a.status = 'approved'
  `).get(slug);

  if (!app) {
    return res.status(404).json({ error: 'App not found or not published' });
  }

  // Increment total views asynchronously
  db.prepare('UPDATE apps SET total_views = total_views + 1 WHERE id = ?').run(app.id);

  // Screenshots
  const screenshots = db.prepare(`
    SELECT id, url, caption, sort_order
    FROM app_screenshots
    WHERE app_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(app.id);

  // Videos
  const videos = db.prepare(`
    SELECT id, url, thumbnail_url, sort_order
    FROM app_videos
    WHERE app_id = ?
    ORDER BY sort_order ASC
  `).all(app.id);

  // Permissions
  const permissions = db.prepare(`
    SELECT id, permission, reason, is_dangerous
    FROM app_permissions
    WHERE app_id = ?
    ORDER BY is_dangerous DESC, permission ASC
  `).all(app.id);

  // Current version & version history
  const currentVersion = db.prepare(`
    SELECT * FROM app_versions
    WHERE app_id = ? AND is_current = 1
  `).get(app.id);

  const versionHistory = db.prepare(`
    SELECT id, version_name, version_code, min_android_version, whats_new, approved_at, apk_size_bytes
    FROM app_versions
    WHERE app_id = ? AND status = 'approved'
    ORDER BY version_code DESC
  `).all(app.id);

  // Rating distribution
  const ratingDistRows = db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM reviews
    WHERE app_id = ? AND status = 'approved'
    GROUP BY rating
  `).all(app.id);

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistRows.forEach(r => { ratingDistribution[r.rating] = r.count; });

  // Top reviews
  const topReviews = db.prepare(`
    SELECT
      id, reviewer_name, rating, title, body, device_info,
      is_verified_download, helpful_count, admin_response, admin_responded_at, created_at
    FROM reviews
    WHERE app_id = ? AND status = 'approved'
    ORDER BY helpful_count DESC, created_at DESC
    LIMIT 3
  `).all(app.id);

  // More apps from this developer
  const moreFromDeveloper = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.icon_url, a.average_rating, a.total_downloads, c.name as category
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.developer_id = ? AND a.id != ? AND a.status = 'approved'
    ORDER BY a.total_downloads DESC
    LIMIT 4
  `).all(app.developer_id, app.id);

  res.json({
    app,
    screenshots,
    videos,
    permissions,
    currentVersion,
    versionHistory,
    ratingDistribution,
    topReviews,
    moreFromDeveloper,
  });
});

/**
 * GET /api/v1/apps/:slug/reviews
 * Paginated reviews for an app
 */
router.get('/:slug/reviews', (req, res) => {
  const { slug } = req.params;
  const page = Math.max(1, parseInt(req.query.page || 1, 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || 10, 10)));
  const offset = (page - 1) * limit;

  const app = db.prepare('SELECT id FROM apps WHERE slug = ?').get(slug);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const total = db.prepare("SELECT COUNT(*) as c FROM reviews WHERE app_id = ? AND status = 'approved'").get(app.id).c;
  const totalPages = Math.ceil(total / limit);

  const reviews = db.prepare(`
    SELECT
      id, reviewer_name, rating, title, body, device_info,
      is_verified_download, helpful_count, admin_response, admin_responded_at, created_at
    FROM reviews
    WHERE app_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(app.id, limit, offset);

  res.json({
    reviews,
    pagination: { total, page, limit, totalPages },
  });
});

/**
 * GET /api/v1/apps/:slug/download
 * Download app APK file and increment download count
 */
router.get('/:slug/download', downloadLimiter, optionalAuth, (req, res) => {
  const { slug } = req.params;

  const app = db.prepare(`
    SELECT a.id, a.name, a.current_version, v.id as version_id, v.apk_url
    FROM apps a
    LEFT JOIN app_versions v ON a.id = v.app_id AND v.is_current = 1
    WHERE a.slug = ? AND a.status = 'approved'
  `).get(slug);

  if (!app || !app.apk_url) {
    return res.status(404).json({ error: 'APK file not available for download' });
  }

  // Resolve absolute path
  const uploadsBase = path.resolve(__dirname, '..');
  const relativeApkPath = app.apk_url.startsWith('/') ? app.apk_url.slice(1) : app.apk_url;
  const fullPath = path.join(uploadsBase, relativeApkPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'APK binary file not found on server storage.' });
  }

  // Increment download stats in database
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const userId = req.user?.id || null;

    db.transaction(() => {
      db.prepare('UPDATE apps SET total_downloads = total_downloads + 1 WHERE id = ?').run(app.id);
      db.prepare(`
        INSERT INTO download_logs (app_id, version_id, user_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `).run(app.id, app.version_id, userId, ip, userAgent);
    })();
  } catch (err) {
    console.error('Download logging error:', err);
  }

  const filename = `${app.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-v${app.current_version}.apk`;
  res.download(fullPath, filename);
});

export default router;
