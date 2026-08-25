import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { appSubmissionUpload, versionUpload } from '../middleware/upload.js';
import { generateUniqueSlug, processAppIcon, processBanner } from '../utils/helpers.js';

const router = Router();

// Protect all developer routes
router.use(authenticate);
router.use(requireRole('developer', 'admin'));

/**
 * GET /api/v1/developer/dashboard
 * Aggregated dashboard stats for developer
 */
router.get('/dashboard', (req, res) => {
  const developerId = req.user.id;

  // Overview stats
  const stats = db.prepare(`
    SELECT
      COUNT(id) as total_apps,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as active_apps,
      COALESCE(SUM(total_downloads), 0) as total_downloads,
      COALESCE(SUM(total_reviews), 0) as total_reviews,
      ROUND(COALESCE(AVG(CASE WHEN total_reviews > 0 THEN average_rating END), 0.0), 1) as avg_rating
    FROM apps
    WHERE developer_id = ?
  `).get(developerId);

  // My apps list
  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.package_name, a.current_version,
      a.status, a.average_rating, a.total_downloads, a.total_reviews,
      a.icon_url, a.admin_notes, a.submitted_at, a.approved_at,
      c.name as category
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.developer_id = ?
    ORDER BY a.created_at DESC
  `).all(developerId);

  // Daily downloads in last 30 days
  const downloadChart = db.prepare(`
    SELECT
      date(dl.downloaded_at) as date,
      COUNT(dl.id) as count
    FROM download_logs dl
    JOIN apps a ON dl.app_id = a.id
    WHERE a.developer_id = ?
      AND dl.downloaded_at >= date('now', '-30 days')
    GROUP BY date(dl.downloaded_at)
    ORDER BY date ASC
  `).all(developerId);

  // Recent reviews on developer's apps
  const recentReviews = db.prepare(`
    SELECT
      r.id, r.reviewer_name, r.rating, r.title, r.body,
      r.created_at, a.name as app_name, a.slug as app_slug
    FROM reviews r
    JOIN apps a ON r.app_id = a.id
    WHERE a.developer_id = ?
    ORDER BY r.created_at DESC
    LIMIT 5
  `).all(developerId);

  // Unread notifications
  const notifications = db.prepare(`
    SELECT id, title, body, type, is_read, data, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(developerId);

  res.json({
    stats,
    apps,
    downloadChart,
    recentReviews,
    notifications,
  });
});

/**
 * GET /api/v1/developer/apps
 * List all apps submitted by developer
 */
router.get('/apps', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.*,
      c.name as category,
      (SELECT COUNT(*) FROM app_versions v WHERE v.app_id = a.id) as total_versions
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.developer_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);

  res.json({ apps });
});

/**
 * GET /api/v1/developer/apps/:id
 * Get details of developer's specific app
 */
router.get('/apps/:id', (req, res) => {
  const appId = req.params.id;

  const app = db.prepare(`
    SELECT a.*, c.name as category
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.id = ? AND a.developer_id = ?
  `).get(appId, req.user.id);

  if (!app) return res.status(404).json({ error: 'App not found' });

  const screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order ASC').all(appId);
  const versions = db.prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY version_code DESC').all(appId);
  const permissions = db.prepare('SELECT * FROM app_permissions WHERE app_id = ?').all(appId);

  res.json({ app, screenshots, versions, permissions });
});

/**
 * POST /api/v1/developer/apps
 * Submit a new app (Multipart form upload with Icon, Banner, Screenshots, Video, APK)
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
  const existingPkg = db.prepare('SELECT id FROM apps WHERE package_name = ?').get(pkgClean);
  if (existingPkg) {
    return res.status(409).json({ error: 'This package name is already registered by another application.' });
  }

  // Find category ID
  const catRow = db.prepare('SELECT id FROM categories WHERE name = ? OR slug = ?').get(category, category);
  if (!catRow) {
    return res.status(400).json({ error: 'Invalid category specified.' });
  }

  try {
    const slug = generateUniqueSlug(name);

    // Process icon & banner
    const iconFile = files.icon[0];
    const iconUrl = await processAppIcon(iconFile.path);

    let bannerUrl = null;
    if (files.banner && files.banner.length > 0) {
      bannerUrl = await processBanner(files.banner[0].path);
    }

    // Process APK
    const apkFile = files.apk[0];
    const apkUrl = `/uploads/apks/${path.basename(apkFile.path)}`;
    const apkSizeBytes = apkFile.size;

    // Process Video if uploaded
    let videoUrl = null;
    if (files.video && files.video.length > 0) {
      videoUrl = `/uploads/videos/${path.basename(files.video[0].path)}`;
    }

    const insertApp = db.transaction(() => {
      // 1. Insert App
      const appResult = db.prepare(`
        INSERT INTO apps (
          developer_id, name, slug, package_name, tagline, description,
          category_id, content_rating, min_android_version, status,
          current_version, version_code, apk_size_bytes, icon_url, banner_url
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'pending',
          ?, ?, ?, ?, ?
        )
      `).run(
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
        bannerUrl
      );

      const appId = appResult.lastInsertRowid;

      // 2. Insert Version 1
      db.prepare(`
        INSERT INTO app_versions (
          app_id, version_name, version_code, apk_url, apk_size_bytes,
          min_android_version, whats_new, status, is_current
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1)
      `).run(
        appId,
        current_version.trim(),
        parseInt(version_code, 10),
        apkUrl,
        apkSizeBytes,
        min_android_version,
        whats_new
      );

      // 3. Insert Screenshots
      let captionsList = [];
      try {
        if (screenshot_captions) captionsList = JSON.parse(screenshot_captions);
      } catch {}

      const insertSs = db.prepare('INSERT INTO app_screenshots (app_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
      files.screenshots.forEach((ss, idx) => {
        const ssUrl = `/uploads/screenshots/${path.basename(ss.path)}`;
        const caption = captionsList[idx] || `Screenshot ${idx + 1}`;
        insertSs.run(appId, ssUrl, caption, idx + 1);
      });

      // 4. Insert Video
      if (videoUrl) {
        db.prepare('INSERT INTO app_videos (app_id, url, thumbnail_url, sort_order) VALUES (?, ?, ?, 1)')
          .run(appId, videoUrl, bannerUrl || iconUrl);
      }

      // 5. Insert Tags
      if (tags) {
        let tagList = [];
        try { tagList = typeof tags === 'string' ? JSON.parse(tags) : tags; } catch {}
        if (Array.isArray(tagList)) {
          const insertTag = db.prepare('INSERT INTO app_tags (app_id, tag) VALUES (?, ?)');
          tagList.slice(0, 10).forEach(t => {
            if (t && typeof t === 'string') insertTag.run(appId, t.trim());
          });
        }
      }

      // 6. Insert Permissions
      if (permissions) {
        let permList = [];
        try { permList = typeof permissions === 'string' ? JSON.parse(permissions) : permissions; } catch {}
        if (Array.isArray(permList)) {
          const insertPerm = db.prepare('INSERT INTO app_permissions (app_id, permission, reason, is_dangerous) VALUES (?, ?, ?, ?)');
          permList.forEach(p => {
            if (p.permission) {
              insertPerm.run(appId, p.permission.trim().toUpperCase(), p.reason || null, p.is_dangerous ? 1 : 0);
            }
          });
        }
      }

      return { appId, slug };
    });

    const result = insertApp();

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
router.post('/apps/:id/versions', versionUpload, (req, res) => {
  const appId = req.params.id;
  const { version_name, version_code, min_android_version = '6.0', whats_new } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'New APK file is required.' });
  }

  const app = db.prepare('SELECT id, name FROM apps WHERE id = ? AND developer_id = ?').get(appId, req.user.id);
  if (!app) return res.status(404).json({ error: 'App not found.' });

  const code = parseInt(version_code, 10);
  const highestVersion = db.prepare('SELECT MAX(version_code) as max_code FROM app_versions WHERE app_id = ?').get(appId);
  if (highestVersion?.max_code && code <= highestVersion.max_code) {
    return res.status(400).json({ error: `Version code must be greater than previous version (${highestVersion.max_code}).` });
  }

  const apkUrl = `/uploads/apks/${path.basename(req.file.path)}`;

  db.prepare(`
    INSERT INTO app_versions (
      app_id, version_name, version_code, apk_url, apk_size_bytes,
      min_android_version, whats_new, status, is_current
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
  `).run(
    appId,
    version_name.trim(),
    code,
    apkUrl,
    req.file.size,
    min_android_version,
    whats_new || null
  );

  res.status(201).json({
    message: `Version ${version_name} submitted successfully and is awaiting review!`,
  });
});

/**
 * GET /api/v1/developer/analytics/:appId
 * In-depth analytics for a specific developer app
 */
router.get('/analytics/:appId', (req, res) => {
  const appId = req.params.appId;
  const app = db.prepare('SELECT * FROM apps WHERE id = ? AND developer_id = ?').get(appId, req.user.id);
  if (!app) return res.status(404).json({ error: 'App not found' });

  // 30 days downloads
  const dailyDownloads = db.prepare(`
    SELECT date(downloaded_at) as date, COUNT(id) as count
    FROM download_logs
    WHERE app_id = ? AND downloaded_at >= date('now', '-30 days')
    GROUP BY date(downloaded_at)
    ORDER BY date ASC
  `).all(appId);

  // Rating distribution
  const ratingDist = db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM reviews
    WHERE app_id = ? AND status = 'approved'
    GROUP BY rating
  `).all(appId);

  // Version adoption
  const versionAdoption = db.prepare(`
    SELECT v.version_name, COUNT(dl.id) as downloads
    FROM app_versions v
    LEFT JOIN download_logs dl ON v.id = dl.version_id
    WHERE v.app_id = ?
    GROUP BY v.id
    ORDER BY v.version_code DESC
  `).all(appId);

  res.json({
    app,
    dailyDownloads,
    ratingDist,
    versionAdoption,
  });
});

/**
 * GET /api/v1/developer/notifications
 * Get notifications for current developer
 */
router.get('/notifications', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json({ notifications });
});

/**
 * PUT /api/v1/developer/notifications/:id/read
 * Mark single notification as read
 */
router.put('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

/**
 * PUT /api/v1/developer/notifications/read-all
 * Mark all notifications as read
 */
router.put('/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

export default router;
