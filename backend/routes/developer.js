import { Router } from 'express';
import { queryOne, queryAll, queryRun, withTransaction } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appSubmissionUpload, versionUpload } from '../middleware/upload.js';
import { generateUniqueSlug } from '../utils/helpers.js';

const router = Router();

// Protect all developer routes
router.use(authenticate);
router.use(requireRole('developer', 'admin'));

/**
 * GET /api/v1/developer/dashboard
 * Aggregated dashboard stats for developer
 */
router.get('/dashboard', async (req, res) => {
  try {
    const developerId = req.user.id;

    // Overview stats
    const stats = await queryOne(`
      SELECT
        COUNT(id)::int as total_apps,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0)::int as active_apps,
        COALESCE(SUM(total_downloads), 0)::int as total_downloads,
        COALESCE(SUM(total_reviews), 0)::int as total_reviews,
        ROUND(COALESCE(AVG(CASE WHEN total_reviews > 0 THEN average_rating END), 0.0), 1)::float as avg_rating
      FROM apps
      WHERE developer_id = $1
    `, [developerId]);

    // My apps list
    const apps = await queryAll(`
      SELECT
        a.id, a.name, a.slug, a.package_name, a.current_version,
        a.status, a.average_rating, a.total_downloads, a.total_reviews,
        a.icon_url, a.admin_notes, a.submitted_at, a.approved_at,
        c.name as category
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.developer_id = $1
      ORDER BY a.created_at DESC
    `, [developerId]);

    // Daily downloads in last 30 days
    const downloadChart = await queryAll(`
      SELECT
        dl.downloaded_at::date as date,
        COUNT(dl.id)::int as count
      FROM download_logs dl
      JOIN apps a ON dl.app_id = a.id
      WHERE a.developer_id = $1
        AND dl.downloaded_at >= NOW() - INTERVAL '30 days'
      GROUP BY dl.downloaded_at::date
      ORDER BY date ASC
    `, [developerId]);

    // Recent reviews on developer's apps
    const recentReviews = await queryAll(`
      SELECT
        r.id, r.reviewer_name, r.rating, r.title, r.body,
        r.created_at, a.name as app_name, a.slug as app_slug
      FROM reviews r
      JOIN apps a ON r.app_id = a.id
      WHERE a.developer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [developerId]);

    // Unread notifications
    const notifications = await queryAll(`
      SELECT id, title, body, type, is_read, data, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [developerId]);

    res.json({
      stats,
      apps,
      downloadChart,
      recentReviews,
      notifications,
    });
  } catch (err) {
    console.error('Developer dashboard error:', err);
    res.status(500).json({ error: 'Failed to load developer dashboard' });
  }
});

/**
 * GET /api/v1/developer/apps
 * List all apps submitted by developer
 */
router.get('/apps', async (req, res) => {
  try {
    const apps = await queryAll(`
      SELECT
        a.*,
        c.name as category,
        (SELECT COUNT(*)::int FROM app_versions v WHERE v.app_id = a.id) as total_versions
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.developer_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);

    res.json({ apps });
  } catch (err) {
    console.error('Developer apps list error:', err);
    res.status(500).json({ error: 'Failed to fetch developer apps' });
  }
});

/**
 * GET /api/v1/developer/apps/:id
 * Get details of developer's specific app
 */
router.get('/apps/:id', async (req, res) => {
  try {
    const appId = req.params.id;

    const app = await queryOne(`
      SELECT a.*, c.name as category
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.id = $1 AND a.developer_id = $2
    `, [appId, req.user.id]);

    if (!app) return res.status(404).json({ error: 'App not found' });

    const screenshots = await queryAll('SELECT * FROM app_screenshots WHERE app_id = $1 ORDER BY sort_order ASC', [appId]);
    const versions = await queryAll('SELECT * FROM app_versions WHERE app_id = $1 ORDER BY version_code DESC', [appId]);
    const permissions = await queryAll('SELECT * FROM app_permissions WHERE app_id = $1', [appId]);

    res.json({ app, screenshots, versions, permissions });
  } catch (err) {
    console.error('Developer app details error:', err);
    res.status(500).json({ error: 'Failed to fetch app details' });
  }
});

/**
 * POST /api/v1/developer/apps
 * Submit a new app (Multipart form upload to Cloudinary)
 */
router.post('/apps', appSubmissionUpload, async (req, res) => {
  const files = req.files || {};
  const {
    name,
    package_name,
    tagline,
    description,
    category,
    content_rating = 'Everyone',
    current_version,
    version_code,
    min_android_version = '6.0',
    whats_new = 'Initial release',
    tags,
    permissions,
    screenshot_captions,
  } = req.body;

  // Basic validation
  if (!name || !package_name || !tagline || !description || !category || !current_version || !version_code) {
    return res.status(400).json({ error: 'Missing required text fields.' });
  }

  if (!files.icon || files.icon.length === 0) {
    return res.status(400).json({ error: 'App icon image is required.' });
  }

  if (!files.apk || files.apk.length === 0) {
    return res.status(400).json({ error: 'APK binary package file is required.' });
  }

  if (!files.screenshots || files.screenshots.length < 2) {
    return res.status(400).json({ error: 'At least 2 screenshots are required.' });
  }

  // Validate package name format & uniqueness
  const pkgClean = package_name.trim().toLowerCase();
  const existingPkg = await queryOne('SELECT id FROM apps WHERE package_name = $1', [pkgClean]);
  if (existingPkg) {
    return res.status(409).json({ error: 'This package name is already registered by another application.' });
  }

  // Find category ID
  const catRow = await queryOne('SELECT id FROM categories WHERE name = $1 OR slug = $1', [category]);
  if (!catRow) {
    return res.status(400).json({ error: 'Invalid category specified.' });
  }

  try {
    const slug = await generateUniqueSlug(name);

    // Process icon & banner URLs from Cloudinary Multer
    const iconUrl = files.icon[0].path;
    let bannerUrl = files.banner && files.banner.length > 0 ? files.banner[0].path : null;

    // Process APK
    const apkFile = files.apk[0];
    const apkUrl = apkFile.path;
    const apkSizeBytes = apkFile.size;

    // Process Video if uploaded
    let videoUrl = files.video && files.video.length > 0 ? files.video[0].path : null;

    const result = await withTransaction(async (client) => {
      // 1. Insert App
      const appResult = await client.query(`
        INSERT INTO apps (
          developer_id, name, slug, package_name, tagline, description,
          category_id, content_rating, min_android_version, status,
          current_version, version_code, apk_size_bytes, icon_url, banner_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, 'pending',
          $10, $11, $12, $13, $14
        ) RETURNING id
      `, [
        req.user.id,
        name.trim(),
        slug,
        pkgClean,
        tagline.trim(),
        description.trim(),
        catRow.id,
        content_rating,
        min_android_version,
        current_version.trim(),
        parseInt(version_code, 10),
        apkSizeBytes,
        iconUrl,
        bannerUrl,
      ]);

      const appId = appResult.rows[0].id;

      // 2. Insert Version 1
      await client.query(`
        INSERT INTO app_versions (
          app_id, version_name, version_code, apk_url, apk_size_bytes,
          min_android_version, whats_new, status, is_current
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 1)
      `, [
        appId,
        current_version.trim(),
        parseInt(version_code, 10),
        apkUrl,
        apkSizeBytes,
        min_android_version,
        whats_new,
      ]);

      // 3. Insert Screenshots
      let captionsList = [];
      try {
        if (screenshot_captions) captionsList = JSON.parse(screenshot_captions);
      } catch {}

      for (let idx = 0; idx < files.screenshots.length; idx++) {
        const ss = files.screenshots[idx];
        const ssUrl = ss.path;
        const caption = captionsList[idx] || `Screenshot ${idx + 1}`;
        await client.query(
          'INSERT INTO app_screenshots (app_id, url, caption, sort_order) VALUES ($1, $2, $3, $4)',
          [appId, ssUrl, caption, idx + 1]
        );
      }

      // 4. Insert Video
      if (videoUrl) {
        await client.query(
          'INSERT INTO app_videos (app_id, url, thumbnail_url, sort_order) VALUES ($1, $2, $3, 1)',
          [appId, videoUrl, bannerUrl || iconUrl]
        );
      }

      // 5. Insert Tags
      if (tags) {
        let tagList = [];
        try { tagList = typeof tags === 'string' ? JSON.parse(tags) : tags; } catch {}
        if (Array.isArray(tagList)) {
          for (const t of tagList.slice(0, 10)) {
            if (t && typeof t === 'string') {
              await client.query(
                'INSERT INTO app_tags (app_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [appId, t.trim()]
              );
            }
          }
        }
      }

      // 6. Insert Permissions
      if (permissions) {
        let permList = [];
        try { permList = typeof permissions === 'string' ? JSON.parse(permissions) : permissions; } catch {}
        if (Array.isArray(permList)) {
          for (const p of permList) {
            if (p.permission) {
              await client.query(
                'INSERT INTO app_permissions (app_id, permission, reason, is_dangerous) VALUES ($1, $2, $3, $4)',
                [appId, p.permission.trim().toUpperCase(), p.reason || null, p.is_dangerous ? 1 : 0]
              );
            }
          }
        }
      }

      return { appId, slug };
    });

    res.status(201).json({
      message: 'App submitted successfully and is awaiting review!',
      app_id: result.appId,
      slug: result.slug,
    });
  } catch (err) {
    console.error('App submission error:', err);
    res.status(500).json({ error: 'Failed to process app submission: ' + err.message });
  }
});

/**
 * POST /api/v1/developer/apps/:id/versions
 * Submit a new APK version update for an existing app
 */
router.post('/apps/:id/versions', versionUpload, async (req, res) => {
  try {
    const appId = req.params.id;
    const { version_name, version_code, min_android_version = '6.0', whats_new } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'New APK file is required.' });
    }

    const app = await queryOne('SELECT id, name FROM apps WHERE id = $1 AND developer_id = $2', [appId, req.user.id]);
    if (!app) return res.status(404).json({ error: 'App not found.' });

    const code = parseInt(version_code, 10);
    const highestVersion = await queryOne('SELECT MAX(version_code) as max_code FROM app_versions WHERE app_id = $1', [appId]);
    if (highestVersion?.max_code && code <= highestVersion.max_code) {
      return res.status(400).json({ error: `Version code must be greater than previous version (${highestVersion.max_code}).` });
    }

    const apkUrl = req.file.path;

    await queryRun(`
      INSERT INTO app_versions (
        app_id, version_name, version_code, apk_url, apk_size_bytes,
        min_android_version, whats_new, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0)
    `, [
      appId,
      version_name.trim(),
      code,
      apkUrl,
      req.file.size,
      min_android_version,
      whats_new || null,
    ]);

    res.status(201).json({
      message: `Version ${version_name} submitted successfully and is awaiting review!`,
    });
  } catch (err) {
    console.error('Version submission error:', err);
    res.status(500).json({ error: 'Failed to submit version update: ' + err.message });
  }
});

/**
 * GET /api/v1/developer/analytics/:appId
 * In-depth analytics for a specific developer app
 */
router.get('/analytics/:appId', async (req, res) => {
  try {
    const appId = req.params.appId;
    const app = await queryOne('SELECT * FROM apps WHERE id = $1 AND developer_id = $2', [appId, req.user.id]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    // 30 days downloads
    const dailyDownloads = await queryAll(`
      SELECT dl.downloaded_at::date as date, COUNT(dl.id)::int as count
      FROM download_logs dl
      WHERE dl.app_id = $1 AND dl.downloaded_at >= NOW() - INTERVAL '30 days'
      GROUP BY dl.downloaded_at::date
      ORDER BY date ASC
    `, [appId]);

    // Rating distribution
    const ratingDist = await queryAll(`
      SELECT rating, COUNT(*)::int as count
      FROM reviews
      WHERE app_id = $1 AND status = 'approved'
      GROUP BY rating
    `, [appId]);

    // Version adoption
    const versionAdoption = await queryAll(`
      SELECT v.version_name, COUNT(dl.id)::int as downloads
      FROM app_versions v
      LEFT JOIN download_logs dl ON v.id = dl.version_id
      WHERE v.app_id = $1
      GROUP BY v.id
      ORDER BY v.version_code DESC
    `, [appId]);

    res.json({
      app,
      dailyDownloads,
      ratingDist,
      versionAdoption,
    });
  } catch (err) {
    console.error('Developer analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/v1/developer/notifications
 * Get notifications for current developer
 */
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await queryAll(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ notifications });
  } catch (err) {
    console.error('Developer notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/v1/developer/notifications/:id/read
 * Mark single notification as read
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await queryRun('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PUT /api/v1/developer/notifications/read-all
 * Mark all notifications as read
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    await queryRun('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export default router;
