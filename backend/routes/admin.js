import { Router } from 'express';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logAdminAction, createNotification, recalculateAppRating } from '../utils/helpers.js';
import { sendAppApprovedEmail, sendAppRejectedEmail } from '../services/emailService.js';

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/v1/admin/dashboard
 * High-level KPIs and analytics overview
 */
router.get('/dashboard', (req, res) => {
  // Total downloads today & all time
  const dlToday = db.prepare("SELECT COUNT(*) as c FROM download_logs WHERE date(downloaded_at) = date('now')").get().c;
  const dlAll = db.prepare("SELECT COUNT(*) as c FROM download_logs").get().c;

  // Pending items
  const pendingApps = db.prepare("SELECT COUNT(*) as c FROM apps WHERE status = 'pending'").get().c;
  const pendingVersions = db.prepare("SELECT COUNT(*) as c FROM app_versions WHERE status = 'pending'").get().c;
  const pendingReviews = db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status = 'pending'").get().c;

  // Total counts
  const totalApps = db.prepare("SELECT status, COUNT(*) as c FROM apps GROUP BY status").all();
  const totalUsers = db.prepare("SELECT role, COUNT(*) as c FROM users GROUP BY role").all();

  // Downloads last 30 days
  const downloadChart = db.prepare(`
    SELECT date(downloaded_at) as date, COUNT(*) as count
    FROM download_logs
    WHERE downloaded_at >= date('now', '-30 days')
    GROUP BY date(downloaded_at)
    ORDER BY date ASC
  `).all();

  // Category distribution
  const categoryDist = db.prepare(`
    SELECT c.name as category, COUNT(a.id) as count
    FROM categories c
    LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'approved'
    GROUP BY c.id
  `).all();

  // Recent audit actions
  const recentActions = db.prepare(`
    SELECT l.*, u.display_name as admin_name
    FROM admin_action_logs l
    JOIN users u ON l.admin_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    totalDownloadsToday: dlToday,
    totalDownloadsAllTime: dlAll,
    pendingApps,
    pendingVersions,
    pendingReviews,
    totalApps,
    totalUsers,
    downloadChart,
    categoryDist,
    recentActions,
  });
});

/**
 * GET /api/v1/admin/apps
 * Paginated apps list with filter
 */
router.get('/apps', (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  let params = [];

  if (status) {
    whereClauses.push('a.status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(a.name LIKE ? OR a.package_name LIKE ? OR u.display_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.join(' AND ');

  const total = db.prepare(`
    SELECT COUNT(*) as c
    FROM apps a
    JOIN users u ON a.developer_id = u.id
    WHERE ${whereSql}
  `).get(...params).c;

  const totalPages = Math.ceil(total / limitNum);

  const apps = db.prepare(`
    SELECT
      a.*,
      c.name as category,
      u.display_name as developer_name, u.email as developer_email
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    apps,
    pagination: { total, page: pageNum, limit: limitNum, totalPages },
  });
});

/**
 * GET /api/v1/admin/apps/pending
 * List of apps awaiting admin review
 */
router.get('/apps/pending', (req, res) => {
  const apps = db.prepare(`
    SELECT
      a.*,
      c.name as category,
      u.display_name as developer_name, u.email as developer_email, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.status = 'pending'
    ORDER BY a.submitted_at ASC
  `).all();

  res.json({ apps });
});

/**
 * GET /api/v1/admin/apps/:id
 * Full app details for review
 */
router.get('/apps/:id', (req, res) => {
  const appId = req.params.id;

  const app = db.prepare(`
    SELECT
      a.*,
      c.name as category,
      u.display_name as developer_name, u.email as developer_email, u.username as developer_username
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    JOIN users u ON a.developer_id = u.id
    WHERE a.id = ?
  `).get(appId);

  if (!app) return res.status(404).json({ error: 'App not found' });

  const screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order ASC').all(appId);
  const permissions = db.prepare('SELECT * FROM app_permissions WHERE app_id = ?').all(appId);
  const versions = db.prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY version_code DESC').all(appId);

  res.json({ app, screenshots, permissions, versions });
});

/**
 * PUT /api/v1/admin/apps/:id/approve
 * Approve an app submission
 */
router.put('/apps/:id/approve', async (req, res) => {
  const appId = req.params.id;
  const { notes } = req.body;

  const app = db.prepare(`
    SELECT a.*, u.display_name, u.email
    FROM apps a
    JOIN users u ON a.developer_id = u.id
    WHERE a.id = ?
  `).get(appId);

  if (!app) return res.status(404).json({ error: 'App not found' });

  db.transaction(() => {
    // Approve app
    db.prepare(`
      UPDATE apps
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(notes || null, appId);

    // Approve initial current version if pending
    db.prepare(`
      UPDATE app_versions
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP
      WHERE app_id = ? AND is_current = 1 AND status = 'pending'
    `).run(appId);

    // Log admin action
    logAdminAction(req.user.id, 'app_approved', 'app', appId, { name: app.name, notes });

    // In-app notification
    createNotification(
      app.developer_id,
      `App Approved: ${app.name} is now live! 🎉`,
      `Your app "${app.name}" (v${app.current_version}) has been approved and published to the store.`,
      'app_approved',
      { app_id: appId, slug: app.slug }
    );
  })();

  // Send email notification in background
  sendAppApprovedEmail(
    { display_name: app.display_name, email: app.email },
    app
  ).catch(err => console.error('Email error:', err));

  res.json({ message: `"${app.name}" has been approved and published.` });
});

/**
 * PUT /api/v1/admin/apps/:id/reject
 * Reject an app submission
 */
router.put('/apps/:id/reject', async (req, res) => {
  const appId = req.params.id;
  const { notes } = req.body;

  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  const app = db.prepare(`
    SELECT a.*, u.display_name, u.email
    FROM apps a
    JOIN users u ON a.developer_id = u.id
    WHERE a.id = ?
  `).get(appId);

  if (!app) return res.status(404).json({ error: 'App not found' });

  db.transaction(() => {
    db.prepare(`
      UPDATE apps
      SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(notes.trim(), appId);

    logAdminAction(req.user.id, 'app_rejected', 'app', appId, { name: app.name, reason: notes });

    createNotification(
      app.developer_id,
      `Submission Update for ${app.name}`,
      `Your app was not approved: ${notes}`,
      'app_rejected',
      { app_id: appId, slug: app.slug }
    );
  })();

  sendAppRejectedEmail(
    { display_name: app.display_name, email: app.email },
    app,
    notes
  ).catch(err => console.error('Email error:', err));

  res.json({ message: `"${app.name}" has been rejected.` });
});

/**
 * PUT /api/v1/admin/apps/:id/suspend
 * Suspend an approved app
 */
router.put('/apps/:id/suspend', (req, res) => {
  const appId = req.params.id;
  const { notes = 'Suspended by administration' } = req.body;

  const app = db.prepare('SELECT id, name, developer_id FROM apps WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  db.prepare(`
    UPDATE apps
    SET status = 'suspended', admin_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(notes, appId);

  logAdminAction(req.user.id, 'app_suspended', 'app', appId, { name: app.name, reason: notes });
  createNotification(app.developer_id, `App Suspended: ${app.name}`, notes, 'warning', { app_id: appId });

  res.json({ message: `"${app.name}" has been suspended.` });
});

/**
 * PUT /api/v1/admin/apps/:id/feature
 * Toggle featured app status
 */
router.put('/apps/:id/feature', (req, res) => {
  const appId = req.params.id;
  const app = db.prepare('SELECT id, name, is_featured FROM apps WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const newStatus = app.is_featured ? 0 : 1;
  db.prepare('UPDATE apps SET is_featured = ? WHERE id = ?').run(newStatus, appId);
  logAdminAction(req.user.id, 'app_feature_toggled', 'app', appId, { is_featured: newStatus });

  res.json({ message: `Featured status updated`, is_featured: !!newStatus });
});

/**
 * PUT /api/v1/admin/apps/:id/editors-choice
 * Toggle Editor's Choice status
 */
router.put('/apps/:id/editors-choice', (req, res) => {
  const appId = req.params.id;
  const app = db.prepare('SELECT id, name, is_editors_choice FROM apps WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const newStatus = app.is_editors_choice ? 0 : 1;
  db.prepare('UPDATE apps SET is_editors_choice = ? WHERE id = ?').run(newStatus, appId);
  logAdminAction(req.user.id, 'app_editors_choice_toggled', 'app', appId, { is_editors_choice: newStatus });

  res.json({ message: `Editor's choice status updated`, is_editors_choice: !!newStatus });
});

/**
 * DELETE /api/v1/admin/apps/:id
 * Permanently remove an app and all its assets
 */
router.delete('/apps/:id', (req, res) => {
  const appId = req.params.id;
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  db.prepare('DELETE FROM apps WHERE id = ?').run(appId);
  logAdminAction(req.user.id, 'app_deleted', 'app', appId, { name: app.name, package_name: app.package_name });

  res.json({ message: `"${app.name}" and associated records deleted.` });
});

/**
 * GET /api/v1/admin/versions/pending
 * List pending version updates
 */
router.get('/versions/pending', (req, res) => {
  const versions = db.prepare(`
    SELECT
      v.*,
      a.name as app_name, a.slug as app_slug,
      u.display_name as developer_name, u.email as developer_email
    FROM app_versions v
    JOIN apps a ON v.app_id = a.id
    JOIN users u ON a.developer_id = u.id
    WHERE v.status = 'pending' AND v.is_current = 0
    ORDER BY v.submitted_at ASC
  `).all();

  res.json({ versions });
});

/**
 * PUT /api/v1/admin/versions/:id/approve
 * Approve version update and mark as current
 */
router.put('/versions/:id/approve', (req, res) => {
  const versionId = req.params.id;
  const version = db.prepare(`
    SELECT v.*, a.id as app_id, a.name as app_name, a.developer_id
    FROM app_versions v
    JOIN apps a ON v.app_id = a.id
    WHERE v.id = ?
  `).get(versionId);

  if (!version) return res.status(404).json({ error: 'Version not found' });

  db.transaction(() => {
    // Mark previous current version as not current
    db.prepare('UPDATE app_versions SET is_current = 0 WHERE app_id = ?').run(version.app_id);

    // Mark this version as current and approved
    db.prepare(`
      UPDATE app_versions
      SET status = 'approved', is_current = 1, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(versionId);

    // Update app header metadata
    db.prepare(`
      UPDATE apps
      SET current_version = ?, version_code = ?, apk_size_bytes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(version.version_name, version.version_code, version.apk_size_bytes, version.app_id);

    logAdminAction(req.user.id, 'version_approved', 'version', versionId, { app_name: version.app_name, version: version.version_name });

    createNotification(
      version.developer_id,
      `Version Update Approved: ${version.app_name} v${version.version_name}`,
      `Your update for "${version.app_name}" (v${version.version_name}) is now live for users!`,
      'version_approved',
      { app_id: version.app_id }
    );
  })();

  res.json({ message: `Version v${version.version_name} approved and activated!` });
});

/**
 * PUT /api/v1/admin/versions/:id/reject
 * Reject a version update
 */
router.put('/versions/:id/reject', (req, res) => {
  const versionId = req.params.id;
  const { notes = 'Version update rejected' } = req.body;

  const version = db.prepare(`
    SELECT v.*, a.id as app_id, a.name as app_name, a.developer_id
    FROM app_versions v
    JOIN apps a ON v.app_id = a.id
    WHERE v.id = ?
  `).get(versionId);

  if (!version) return res.status(404).json({ error: 'Version not found' });

  db.prepare(`
    UPDATE app_versions
    SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, admin_notes = ?
    WHERE id = ?
  `).run(notes, versionId);

  logAdminAction(req.user.id, 'version_rejected', 'version', versionId, { app_name: version.app_name, version: version.version_name, reason: notes });
  createNotification(
    version.developer_id,
    `Version Update Rejected for ${version.app_name}`,
    `Version v${version.version_name} was rejected: ${notes}`,
    'version_rejected',
    { app_id: version.app_id }
  );

  res.json({ message: `Version update rejected.` });
});

/**
 * GET /api/v1/admin/users
 * User management list with pagination & search
 */
router.get('/users', (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  let params = [];

  if (role) {
    whereClauses.push('role = ?');
    params.push(role);
  }

  if (search) {
    whereClauses.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${whereSql}`).get(...params).c;
  const totalPages = Math.ceil(total / limitNum);

  const users = db.prepare(`
    SELECT
      id, username, email, role, display_name, is_active, created_at,
      (SELECT COUNT(*) FROM apps WHERE developer_id = users.id) as total_apps
    FROM users
    WHERE ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    users,
    pagination: { total, page: pageNum, limit: limitNum, totalPages },
  });
});

/**
 * PUT /api/v1/admin/users/:id/toggle-active
 * Suspend or unsuspend user
 */
router.put('/users/:id/toggle-active', (req, res) => {
  const userId = req.params.id;
  const user = db.prepare('SELECT id, display_name, is_active FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, userId);
  logAdminAction(req.user.id, newStatus ? 'user_unsuspended' : 'user_suspended', 'user', userId, { display_name: user.display_name });

  res.json({ message: `User status updated`, is_active: !!newStatus });
});

/**
 * PUT /api/v1/admin/users/:id/change-role
 * Change a user's role (user <-> developer <-> admin)
 */
router.put('/users/:id/change-role', (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!['admin', 'developer', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId);
  logAdminAction(req.user.id, 'user_role_changed', 'user', userId, { new_role: role });

  res.json({ message: 'User role updated to ' + role });
});

/**
 * GET /api/v1/admin/reviews
 * Moderate reviews
 */
router.get('/reviews', (req, res) => {
  const { page = 1, limit = 20, status, rating } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  let params = [];

  if (status) {
    whereClauses.push('r.status = ?');
    params.push(status);
  }
  if (rating) {
    whereClauses.push('r.rating = ?');
    params.push(rating);
  }

  const whereSql = whereClauses.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) as c FROM reviews r WHERE ${whereSql}`).get(...params).c;
  const totalPages = Math.ceil(total / limitNum);

  const reviews = db.prepare(`
    SELECT
      r.*,
      a.name as app_name, a.slug as app_slug, a.icon_url as app_icon
    FROM reviews r
    JOIN apps a ON r.app_id = a.id
    WHERE ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    reviews,
    pagination: { total, page: pageNum, limit: limitNum, totalPages },
  });
});

/**
 * PUT /api/v1/admin/reviews/:id/status
 * Change review status (approved, rejected, flagged)
 */
router.put('/reviews/:id/status', (req, res) => {
  const reviewId = req.params.id;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending', 'flagged'].includes(status)) {
    return res.status(400).json({ error: 'Invalid review status' });
  }

  const review = db.prepare('SELECT app_id FROM reviews WHERE id = ?').get(reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  db.prepare('UPDATE reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, reviewId);
  recalculateAppRating(review.app_id);

  res.json({ message: `Review status updated to ${status}` });
});

/**
 * DELETE /api/v1/admin/reviews/:id
 * Delete review
 */
router.delete('/reviews/:id', (req, res) => {
  const reviewId = req.params.id;
  const review = db.prepare('SELECT app_id FROM reviews WHERE id = ?').get(reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
  recalculateAppRating(review.app_id);

  res.json({ message: 'Review deleted successfully' });
});

/**
 * POST /api/v1/admin/reviews/:id/respond
 * Post official response to a review
 */
router.post('/reviews/:id/respond', (req, res) => {
  const reviewId = req.params.id;
  const { response } = req.body;

  if (!response || !response.trim()) {
    return res.status(400).json({ error: 'Response text is required' });
  }

  db.prepare(`
    UPDATE reviews
    SET admin_response = ?, admin_responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(response.trim(), reviewId);

  res.json({ message: 'Response posted successfully' });
});

/**
 * GET /api/v1/admin/downloads
 * Download metrics breakdown
 */
router.get('/downloads', (req, res) => {
  const topApps = db.prepare(`
    SELECT a.id, a.name, a.slug, a.icon_url, a.total_downloads, c.name as category
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'approved'
    ORDER BY a.total_downloads DESC
    LIMIT 10
  `).all();

  const dailyTrend = db.prepare(`
    SELECT date(downloaded_at) as date, COUNT(*) as count
    FROM download_logs
    WHERE downloaded_at >= date('now', '-30 days')
    GROUP BY date(downloaded_at)
    ORDER BY date ASC
  `).all();

  res.json({ topApps, dailyTrend });
});

/**
 * GET /api/v1/admin/settings
 * Read store settings
 */
router.get('/settings', (req, res) => {
  const settingsRows = db.prepare('SELECT * FROM store_settings').all();
  const settings = {};
  settingsRows.forEach(s => { settings[s.key] = s.value; });
  res.json({ settings });
});

/**
 * PUT /api/v1/admin/settings
 * Save store settings
 */
router.put('/settings', (req, res) => {
  const updates = req.body;
  const upsert = db.prepare(`
    INSERT INTO store_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    Object.entries(updates).forEach(([k, v]) => {
      upsert.run(k, String(v));
    });
    logAdminAction(req.user.id, 'settings_updated', 'settings', null, updates);
  })();

  res.json({ message: 'Settings saved successfully' });
});

/**
 * GET /api/v1/admin/actions
 * Paginated admin audit logs
 */
router.get('/actions', (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const total = db.prepare('SELECT COUNT(*) as c FROM admin_action_logs').get().c;
  const totalPages = Math.ceil(total / limitNum);

  const actions = db.prepare(`
    SELECT l.*, u.display_name as admin_name, u.email as admin_email
    FROM admin_action_logs l
    JOIN users u ON l.admin_id = u.id
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limitNum, offset);

  res.json({
    actions,
    pagination: { total, page: pageNum, limit: limitNum, totalPages },
  });
});

export default router;
