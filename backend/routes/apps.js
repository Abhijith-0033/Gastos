import { Router } from 'express';
import { queryOne, queryAll, queryRun, withTransaction } from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';
import { downloadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * GET /api/v1/apps/featured
 * Get featured apps for homepage carousel
 */
router.get('/featured', async (req, res) => {
  try {
    const apps = await queryAll(`
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
    `);

    res.json({ apps });
  } catch (err) {
    console.error('Featured apps error:', err);
    res.status(500).json({ error: 'Failed to fetch featured apps' });
  }
});

/**
 * GET /api/v1/apps/new-releases
 * Get latest released apps
 */
router.get('/new-releases', async (req, res) => {
  try {
    const apps = await queryAll(`
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
    `);

    res.json({ apps });
  } catch (err) {
    console.error('New releases error:', err);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

/**
 * GET /api/v1/apps/top-downloads
 * Get top downloaded apps
 */
router.get('/top-downloads', async (req, res) => {
  try {
    const apps = await queryAll(`
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
    `);

    res.json({ apps });
  } catch (err) {
    console.error('Top downloads error:', err);
    res.status(500).json({ error: 'Failed to fetch top downloads' });
  }
});

/**
 * GET /api/v1/apps/editors-choice
 * Get Editor's Choice apps
 */
router.get('/editors-choice', async (req, res) => {
  try {
    const apps = await queryAll(`
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
    `);

    res.json({ apps });
  } catch (err) {
    console.error('Editors choice error:', err);
    res.status(500).json({ error: 'Failed to fetch editors choice apps' });
  }
});

/**
 * GET /api/v1/apps/meta/categories
 * List all categories with published app counts
 */
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await queryAll(`
      SELECT
        c.id, c.name, c.slug, c.icon, c.description, c.sort_order,
        COUNT(a.id)::int as app_count
      FROM categories c
      LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'approved'
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `);

    res.json({ categories });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/v1/apps/meta/search?q=xyz
 * Live search quick suggestions
 */
router.get('/meta/search', async (req, res) => {
  try {
    const query = req.query.q?.toString().trim() || '';
    if (query.length < 2) {
      return res.json({ apps: [] });
    }

    const apps = await queryAll(`
      SELECT
        a.id, a.name, a.slug, a.icon_url, a.average_rating,
        c.name as category, u.display_name as developer_name
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.developer_id = u.id
      WHERE a.status = 'approved'
        AND (a.name ILIKE $1 OR a.tagline ILIKE $1 OR a.description ILIKE $1)
      ORDER BY a.total_downloads DESC
      LIMIT 6
    `, [`%${query}%`]);

    res.json({ apps });
  } catch (err) {
    console.error('Meta search error:', err);
    res.status(500).json({ error: 'Failed to perform quick search' });
  }
});

/**
 * GET /api/v1/apps
 * Paginated apps list with filter & sort options
 */
router.get('/', async (req, res) => {
  try {
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
    let paramIdx = 1;

    if (category) {
      whereClauses.push(`(c.slug = $${paramIdx} OR c.name = $${paramIdx})`);
      params.push(category);
      paramIdx++;
    }

    if (search) {
      whereClauses.push(`(a.name ILIKE $${paramIdx} OR a.tagline ILIKE $${paramIdx} OR a.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereSql = whereClauses.join(' AND ');

    let orderBySql = 'a.total_downloads DESC';
    if (sort === 'rating') orderBySql = 'a.average_rating DESC, a.total_reviews DESC';
    else if (sort === 'newest') orderBySql = 'a.approved_at DESC, a.created_at DESC';
    else if (sort === 'name') orderBySql = 'a.name ASC';

    const countRow = await queryOne(`
      SELECT COUNT(*)::int as total
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE ${whereSql}
    `, params);

    const total = countRow ? countRow.total : 0;
    const totalPages = Math.ceil(total / limitNum);

    const selectParams = [...params, limitNum, offset];
    const limitIdx = paramIdx;
    const offsetIdx = paramIdx + 1;

    const apps = await queryAll(`
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
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, selectParams);

    res.json({
      apps,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Apps list error:', err);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

/**
 * GET /api/v1/apps/:slug
 * Full details of a single app
 */
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    const app = await queryOne(`
      SELECT
        a.*,
        c.name as category, c.slug as category_slug,
        u.display_name as developer_name, u.username as developer_username,
        u.bio as developer_bio, u.website as developer_website, u.created_at as developer_created_at
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.developer_id = u.id
      WHERE a.slug = $1 AND a.status = 'approved'
    `, [slug]);

    if (!app) {
      return res.status(404).json({ error: 'App not found or not published' });
    }

    // Increment total views asynchronously
    queryRun('UPDATE apps SET total_views = total_views + 1 WHERE id = $1', [app.id]).catch(() => {});

    // Screenshots
    const screenshots = await queryAll(`
      SELECT id, url, caption, sort_order
      FROM app_screenshots
      WHERE app_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [app.id]);

    // Videos
    const videos = await queryAll(`
      SELECT id, url, thumbnail_url, sort_order
      FROM app_videos
      WHERE app_id = $1
      ORDER BY sort_order ASC
    `, [app.id]);

    // Permissions
    const permissions = await queryAll(`
      SELECT id, permission, reason, is_dangerous
      FROM app_permissions
      WHERE app_id = $1
      ORDER BY is_dangerous DESC, permission ASC
    `, [app.id]);

    // Current version & version history
    const currentVersion = await queryOne(`
      SELECT * FROM app_versions
      WHERE app_id = $1 AND is_current = 1
    `, [app.id]);

    const versionHistory = await queryAll(`
      SELECT id, version_name, version_code, min_android_version, whats_new, approved_at, apk_size_bytes
      FROM app_versions
      WHERE app_id = $1 AND status = 'approved'
      ORDER BY version_code DESC
    `, [app.id]);

    // Rating distribution
    const ratingDistRows = await queryAll(`
      SELECT rating, COUNT(*)::int as count
      FROM reviews
      WHERE app_id = $1 AND status = 'approved'
      GROUP BY rating
    `, [app.id]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistRows.forEach(r => { ratingDistribution[r.rating] = Number(r.count); });

    // Top reviews
    const topReviews = await queryAll(`
      SELECT
        id, reviewer_name, rating, title, body, device_info,
        is_verified_download, helpful_count, admin_response, admin_responded_at, created_at
      FROM reviews
      WHERE app_id = $1 AND status = 'approved'
      ORDER BY helpful_count DESC, created_at DESC
      LIMIT 3
    `, [app.id]);

    // More apps from this developer
    const moreFromDeveloper = await queryAll(`
      SELECT
        a.id, a.name, a.slug, a.icon_url, a.average_rating, a.total_downloads, c.name as category
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.developer_id = $1 AND a.id != $2 AND a.status = 'approved'
      ORDER BY a.total_downloads DESC
      LIMIT 4
    `, [app.developer_id, app.id]);

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
  } catch (err) {
    console.error('App detail error:', err);
    res.status(500).json({ error: 'Failed to fetch app details' });
  }
});

/**
 * GET /api/v1/apps/:slug/reviews
 * Paginated reviews for an app
 */
router.get('/:slug/reviews', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || 10, 10)));
    const offset = (page - 1) * limit;

    const app = await queryOne('SELECT id FROM apps WHERE slug = $1', [slug]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const totalRow = await queryOne("SELECT COUNT(*)::int as c FROM reviews WHERE app_id = $1 AND status = 'approved'", [app.id]);
    const total = totalRow ? totalRow.c : 0;
    const totalPages = Math.ceil(total / limit);

    const reviews = await queryAll(`
      SELECT
        id, reviewer_name, rating, title, body, device_info,
        is_verified_download, helpful_count, admin_response, admin_responded_at, created_at
      FROM reviews
      WHERE app_id = $1 AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [app.id, limit, offset]);

    res.json({
      reviews,
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    console.error('App reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * GET /api/v1/apps/:slug/download
 * Download app APK file (Redirects to Cloudinary URL or streams)
 */
router.get('/:slug/download', downloadLimiter, optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await queryOne(`
      SELECT a.id, a.name, a.current_version, v.id as version_id, v.apk_url
      FROM apps a
      LEFT JOIN app_versions v ON a.id = v.app_id AND v.is_current = 1
      WHERE a.slug = $1 AND a.status = 'approved'
    `, [slug]);

    if (!app || !app.apk_url) {
      return res.status(404).json({ error: 'APK file not available for download' });
    }

    // Increment download stats in database
    try {
      const ip = req.ip || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const userId = req.user?.id || null;

      await withTransaction(async (client) => {
        await client.query('UPDATE apps SET total_downloads = total_downloads + 1 WHERE id = $1', [app.id]);
        await client.query(`
          INSERT INTO download_logs (app_id, version_id, user_id, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5)
        `, [app.id, app.version_id, userId, ip, userAgent]);
      });
    } catch (err) {
      console.error('Download logging error:', err);
    }

    // Redirect directly to Cloudinary APK URL
    if (app.apk_url.startsWith('http://') || app.apk_url.startsWith('https://')) {
      return res.redirect(app.apk_url);
    }

    res.status(404).json({ error: 'APK URL is not a valid cloud link.' });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

export default router;
