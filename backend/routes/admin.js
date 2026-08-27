import { Router } from 'express';
import { queryOne, queryAll, queryRun, withTransaction } from '../database/db.js';
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
router.get('/dashboard', async (req, res) => {
  try {
    // Total downloads today & all time
    const dlTodayRow = await queryOne("SELECT COUNT(*)::int as c FROM download_logs WHERE downloaded_at::date = CURRENT_DATE");
    const dlAllRow = await queryOne("SELECT COUNT(*)::int as c FROM download_logs");

    const dlToday = dlTodayRow ? dlTodayRow.c : 0;
    const dlAll = dlAllRow ? dlAllRow.c : 0;

    // Pending items
    const pendingAppsRow = await queryOne("SELECT COUNT(*)::int as c FROM apps WHERE status = 'pending'");
    const pendingVersionsRow = await queryOne("SELECT COUNT(*)::int as c FROM app_versions WHERE status = 'pending'");
    const pendingReviewsRow = await queryOne("SELECT COUNT(*)::int as c FROM reviews WHERE status = 'pending'");

    const pendingApps = pendingAppsRow ? pendingAppsRow.c : 0;
    const pendingVersions = pendingVersionsRow ? pendingVersionsRow.c : 0;
    const pendingReviews = pendingReviewsRow ? pendingReviewsRow.c : 0;

    // Total counts
    const totalApps = await queryAll("SELECT status, COUNT(*)::int as c FROM apps GROUP BY status");
    const totalUsers = await queryAll("SELECT role, COUNT(*)::int as c FROM users GROUP BY role");

    // Downloads last 30 days
    const downloadChart = await queryAll(`
      SELECT downloaded_at::date as date, COUNT(*)::int as count
      FROM download_logs
      WHERE downloaded_at >= NOW() - INTERVAL '30 days'
      GROUP BY downloaded_at::date
      ORDER BY date ASC
    `);

    // Category distribution
    const categoryDist = await queryAll(`
      SELECT c.name as category, COUNT(a.id)::int as count
      FROM categories c
      LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'approved'
      GROUP BY c.id
    `);

    // Recent audit actions
    const recentActions = await queryAll(`
      SELECT l.*, u.display_name as admin_name
      FROM admin_action_logs l
      JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

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
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
});

/**
 * GET /api/v1/admin/apps
 * Paginated apps list with filter
 */
router.get('/apps', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = ['1=1'];
    let params = [];
    let paramIdx = 1;

    if (status) {
      whereClauses.push(`a.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (search) {
      whereClauses.push(`(a.name ILIKE $${paramIdx} OR a.package_name ILIKE $${paramIdx} OR u.display_name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereSql = whereClauses.join(' AND ');

    const totalRow = await queryOne(`
      SELECT COUNT(*)::int as c
      FROM apps a
      JOIN users u ON a.developer_id = u.id
      WHERE ${whereSql}
    `, params);

    const total = totalRow ? totalRow.c : 0;
    const totalPages = Math.ceil(total / limitNum);

    const selectParams = [...params, limitNum, offset];
    const limitIdx = paramIdx;
    const offsetIdx = paramIdx + 1;

    const apps = await queryAll(`
      SELECT
        a.*,
        c.name as category,
        u.display_name as developer_name, u.email as developer_email
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.developer_id = u.id
      WHERE ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, selectParams);

    res.json({
      apps,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (err) {
    console.error('Admin apps list error:', err);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

/**
 * GET /api/v1/admin/apps/pending
 * List of apps awaiting admin review
 */
router.get('/apps/pending', async (req, res) => {
  try {
    const apps = await queryAll(`
      SELECT
        a.*,
        c.name as category,
        u.display_name as developer_name, u.email as developer_email, u.username as developer_username
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.developer_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.submitted_at ASC
    `);

    res.json({ apps });
  } catch (err) {
    console.error('Pending apps error:', err);
    res.status(500).json({ error: 'Failed to fetch pending apps' });
  }
});

/**
 * GET /api/v1/admin/apps/:id
 * Full app details for review
 */
router.get('/apps/:id', async (req, res) => {
  try {
    const appId = req.params.id;

    const app = await queryOne(`
      SELECT
        a.*,
        c.name as category,
        u.display_name as developer_name, u.email as developer_email, u.username as developer_username
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      JOIN users u ON a.developer_id = u.id
      WHERE a.id = $1
    `, [appId]);

    if (!app) return res.status(404).json({ error: 'App not found' });

    const screenshots = await queryAll('SELECT * FROM app_screenshots WHERE app_id = $1 ORDER BY sort_order ASC', [appId]);
    const permissions = await queryAll('SELECT * FROM app_permissions WHERE app_id = $1', [appId]);
    const versions = await queryAll('SELECT * FROM app_versions WHERE app_id = $1 ORDER BY version_code DESC', [appId]);

    res.json({ app, screenshots, permissions, versions });
  } catch (err) {
    console.error('Admin app detail error:', err);
    res.status(500).json({ error: 'Failed to fetch app details' });
  }
});

/**
 * PUT /api/v1/admin/apps/:id/approve
 * Approve an app submission
 */
router.put('/apps/:id/approve', async (req, res) => {
  try {
    const appId = req.params.id;
    const { notes } = req.body;

    const app = await queryOne(`
      SELECT a.*, u.display_name, u.email
      FROM apps a
      JOIN users u ON a.developer_id = u.id
      WHERE a.id = $1
    `, [appId]);

    if (!app) return res.status(404).json({ error: 'App not found' });

    await withTransaction(async (client) => {
      // Approve app
      await client.query(`
        UPDATE apps
        SET status = 'approved', approved_at = NOW(), admin_notes = $1, updated_at = NOW()
        WHERE id = $2
      `, [notes || null, appId]);

      // Approve initial current version if pending
      await client.query(`
        UPDATE app_versions
        SET status = 'approved', approved_at = NOW()
        WHERE app_id = $1 AND is_current = 1 AND status = 'pending'
      `, [appId]);

      // Log admin action
      await logAdminAction(req.user.id, 'app_approved', 'app', appId, { name: app.name, notes });

      // In-app notification
      await createNotification(
        app.developer_id,
        `App Approved: ${app.name} is now live! 🎉`,
        `Your app "${app.name}" (v${app.current_version}) has been approved and published to the store.`,
        'app_approved',
        { app_id: appId, slug: app.slug }
      );
    });

    // Send email notification in background
    sendAppApprovedEmail(
      { display_name: app.display_name, email: app.email },
      app
    ).catch(err => console.error('Email error:', err));

    res.json({ message: `"${app.name}" has been approved and published.` });
  } catch (err) {
    console.error('App approval error:', err);
    res.status(500).json({ error: 'Failed to approve app' });
  }
});

/**
 * PUT /api/v1/admin/apps/:id/reject
 * Reject an app submission
 */
router.put('/apps/:id/reject', async (req, res) => {
  try {
    const appId = req.params.id;
    const { notes } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const app = await queryOne(`
      SELECT a.*, u.display_name, u.email
      FROM apps a
      JOIN users u ON a.developer_id = u.id
      WHERE a.id = $1
    `, [appId]);

    if (!app) return res.status(404).json({ error: 'App not found' });

    await withTransaction(async (client) => {
      await client.query(`
        UPDATE apps
        SET status = 'rejected', rejected_at = NOW(), admin_notes = $1, updated_at = NOW()
        WHERE id = $2
      `, [notes.trim(), appId]);

      await logAdminAction(req.user.id, 'app_rejected', 'app', appId, { name: app.name, reason: notes });

      await createNotification(
        app.developer_id,
        `Submission Update for ${app.name}`,
        `Your app was not approved: ${notes}`,
        'app_rejected',
        { app_id: appId, slug: app.slug }
      );
    });

    sendAppRejectedEmail(
      { display_name: app.display_name, email: app.email },
      app,
      notes
    ).catch(err => console.error('Email error:', err));

    res.json({ message: `"${app.name}" has been rejected.` });
  } catch (err) {
    console.error('App rejection error:', err);
    res.status(500).json({ error: 'Failed to reject app' });
  }
});

/**
 * PUT /api/v1/admin/apps/:id/suspend
 * Suspend an approved app
 */
router.put('/apps/:id/suspend', async (req, res) => {
  try {
    const appId = req.params.id;
    const { notes = 'Suspended by administration' } = req.body;

    const app = await queryOne('SELECT id, name, developer_id FROM apps WHERE id = $1', [appId]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    await queryRun(`
      UPDATE apps
      SET status = 'suspended', admin_notes = $1, updated_at = NOW()
      WHERE id = $2
    `, [notes, appId]);

    await logAdminAction(req.user.id, 'app_suspended', 'app', appId, { name: app.name, reason: notes });
    await createNotification(app.developer_id, `App Suspended: ${app.name}`, notes, 'warning', { app_id: appId });

    res.json({ message: `"${app.name}" has been suspended.` });
  } catch (err) {
    console.error('App suspension error:', err);
    res.status(500).json({ error: 'Failed to suspend app' });
  }
});

/**
 * PUT /api/v1/admin/apps/:id/feature
 * Toggle featured app status
 */
router.put('/apps/:id/feature', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await queryOne('SELECT id, name, is_featured FROM apps WHERE id = $1', [appId]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const newStatus = app.is_featured ? 0 : 1;
    await queryRun('UPDATE apps SET is_featured = $1 WHERE id = $2', [newStatus, appId]);
    await logAdminAction(req.user.id, 'app_feature_toggled', 'app', appId, { is_featured: newStatus });

    res.json({ message: `Featured status updated`, is_featured: !!newStatus });
  } catch (err) {
    console.error('Toggle feature error:', err);
    res.status(500).json({ error: 'Failed to toggle featured status' });
  }
});

/**
 * PUT /api/v1/admin/apps/:id/editors-choice
 * Toggle Editor's Choice status
 */
router.put('/apps/:id/editors-choice', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await queryOne('SELECT id, name, is_editors_choice FROM apps WHERE id = $1', [appId]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const newStatus = app.is_editors_choice ? 0 : 1;
    await queryRun('UPDATE apps SET is_editors_choice = $1 WHERE id = $2', [newStatus, appId]);
    await logAdminAction(req.user.id, 'app_editors_choice_toggled', 'app', appId, { is_editors_choice: newStatus });

    res.json({ message: `Editor's choice status updated`, is_editors_choice: !!newStatus });
  } catch (err) {
    console.error('Toggle editors choice error:', err);
    res.status(500).json({ error: 'Failed to toggle editor choice status' });
  }
});

/**
 * DELETE /api/v1/admin/apps/:id
 * Permanently remove an app and all its assets
 */
router.delete('/apps/:id', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await queryOne('SELECT * FROM apps WHERE id = $1', [appId]);
    if (!app) return res.status(404).json({ error: 'App not found' });

    await queryRun('DELETE FROM apps WHERE id = $1', [appId]);
    await logAdminAction(req.user.id, 'app_deleted', 'app', appId, { name: app.name, package_name: app.package_name });

    res.json({ message: `"${app.name}" and associated records deleted.` });
  } catch (err) {
    console.error('Delete app error:', err);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

/**
 * GET /api/v1/admin/versions/pending
 * List pending version updates
 */
router.get('/versions/pending', async (req, res) => {
  try {
    const versions = await queryAll(`
      SELECT
        v.*,
        a.name as app_name, a.slug as app_slug,
        u.display_name as developer_name, u.email as developer_email
      FROM app_versions v
      JOIN apps a ON v.app_id = a.id
      JOIN users u ON a.developer_id = u.id
      WHERE v.status = 'pending' AND v.is_current = 0
      ORDER BY v.submitted_at ASC
    `);

    res.json({ versions });
  } catch (err) {
    console.error('Pending versions error:', err);
    res.status(500).json({ error: 'Failed to fetch pending versions' });
  }
});

/**
 * PUT /api/v1/admin/versions/:id/approve
 * Approve version update and mark as current
 */
router.put('/versions/:id/approve', async (req, res) => {
  try {
    const versionId = req.params.id;
    const version = await queryOne(`
      SELECT v.*, a.id as app_id, a.name as app_name, a.developer_id
      FROM app_versions v
      JOIN apps a ON v.app_id = a.id
      WHERE v.id = $1
    `, [versionId]);

    if (!version) return res.status(404).json({ error: 'Version not found' });

    await withTransaction(async (client) => {
      // Mark previous current version as not current
      await client.query('UPDATE app_versions SET is_current = 0 WHERE app_id = $1', [version.app_id]);

      // Mark this version as current and approved
      await client.query(`
        UPDATE app_versions
        SET status = 'approved', is_current = 1, approved_at = NOW()
        WHERE id = $1
      `, [versionId]);

      // Update app header metadata
      await client.query(`
        UPDATE apps
        SET current_version = $1, version_code = $2, apk_size_bytes = $3, updated_at = NOW()
        WHERE id = $4
      `, [version.version_name, version.version_code, version.apk_size_bytes, version.app_id]);

      await logAdminAction(req.user.id, 'version_approved', 'version', versionId, { app_name: version.app_name, version: version.version_name });

      await createNotification(
        version.developer_id,
        `Version Update Approved: ${version.app_name} v${version.version_name}`,
        `Your update for "${version.app_name}" (v${version.version_name}) is now live for users!`,
        'version_approved',
        { app_id: version.app_id }
      );
    });

    res.json({ message: `Version v${version.version_name} approved and activated!` });
  } catch (err) {
    console.error('Version approval error:', err);
    res.status(500).json({ error: 'Failed to approve version' });
  }
});

/**
 * PUT /api/v1/admin/versions/:id/reject
 * Reject a version update
 */
router.put('/versions/:id/reject', async (req, res) => {
  try {
    const versionId = req.params.id;
    const { notes = 'Version update rejected' } = req.body;

    const version = await queryOne(`
      SELECT v.*, a.id as app_id, a.name as app_name, a.developer_id
      FROM app_versions v
      JOIN apps a ON v.app_id = a.id
      WHERE v.id = $1
    `, [versionId]);

    if (!version) return res.status(404).json({ error: 'Version not found' });

    await queryRun(`
      UPDATE app_versions
      SET status = 'rejected', rejected_at = NOW(), admin_notes = $1
      WHERE id = $2
    `, [notes, versionId]);

    await logAdminAction(req.user.id, 'version_rejected', 'version', versionId, { app_name: version.app_name, version: version.version_name, reason: notes });
    await createNotification(
      version.developer_id,
      `Version Update Rejected for ${version.app_name}`,
      `Version v${version.version_name} was rejected: ${notes}`,
      'version_rejected',
      { app_id: version.app_id }
    );

    res.json({ message: `Version update rejected.` });
  } catch (err) {
    console.error('Version rejection error:', err);
    res.status(500).json({ error: 'Failed to reject version' });
  }
});

/**
 * GET /api/v1/admin/users
 * User management list with pagination & search
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = ['1=1'];
    let params = [];
    let paramIdx = 1;

    if (role) {
      whereClauses.push(`role = $${paramIdx}`);
      params.push(role);
      paramIdx++;
    }

    if (search) {
      whereClauses.push(`(username ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR display_name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereSql = whereClauses.join(' AND ');

    const totalRow = await queryOne(`SELECT COUNT(*)::int as c FROM users WHERE ${whereSql}`, params);
    const total = totalRow ? totalRow.c : 0;
    const totalPages = Math.ceil(total / limitNum);

    const selectParams = [...params, limitNum, offset];
    const limitIdx = paramIdx;
    const offsetIdx = paramIdx + 1;

    const users = await queryAll(`
      SELECT
        id, username, email, role, display_name, is_active, created_at,
        (SELECT COUNT(*)::int FROM apps WHERE developer_id = users.id) as total_apps
      FROM users
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, selectParams);

    res.json({
      users,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/v1/admin/users/:id/toggle-active
 * Suspend or unsuspend user
 */
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await queryOne('SELECT id, display_name, is_active FROM users WHERE id = $1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.is_active ? 0 : 1;
    await queryRun('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, userId]);
    await logAdminAction(req.user.id, newStatus ? 'user_unsuspended' : 'user_suspended', 'user', userId, { display_name: user.display_name });

    res.json({ message: `User status updated`, is_active: !!newStatus });
  } catch (err) {
    console.error('Toggle user active error:', err);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

/**
 * PUT /api/v1/admin/users/:id/change-role
 * Change a user's role (user <-> developer <-> admin)
 */
router.put('/users/:id/change-role', async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['admin', 'developer', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await queryRun('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
    await logAdminAction(req.user.id, 'user_role_changed', 'user', userId, { new_role: role });

    res.json({ message: 'User role updated to ' + role });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

/**
 * GET /api/v1/admin/reviews
 * Moderate reviews
 */
router.get('/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, rating } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = ['1=1'];
    let params = [];
    let paramIdx = 1;

    if (status) {
      whereClauses.push(`r.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (rating) {
      whereClauses.push(`r.rating = $${paramIdx}`);
      params.push(rating);
      paramIdx++;
    }

    const whereSql = whereClauses.join(' AND ');

    const totalRow = await queryOne(`SELECT COUNT(*)::int as c FROM reviews r WHERE ${whereSql}`, params);
    const total = totalRow ? totalRow.c : 0;
    const totalPages = Math.ceil(total / limitNum);

    const selectParams = [...params, limitNum, offset];
    const limitIdx = paramIdx;
    const offsetIdx = paramIdx + 1;

    const reviews = await queryAll(`
      SELECT
        r.*,
        a.name as app_name, a.slug as app_slug, a.icon_url as app_icon
      FROM reviews r
      JOIN apps a ON r.app_id = a.id
      WHERE ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, selectParams);

    res.json({
      reviews,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (err) {
    console.error('Admin reviews list error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * PUT /api/v1/admin/reviews/:id/status
 * Change review status (approved, rejected, flagged)
 */
router.put('/reviews/:id/status', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }

    const review = await queryOne('SELECT app_id FROM reviews WHERE id = $1', [reviewId]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await queryRun('UPDATE reviews SET status = $1, updated_at = NOW() WHERE id = $2', [status, reviewId]);
    await recalculateAppRating(review.app_id);

    res.json({ message: `Review status updated to ${status}` });
  } catch (err) {
    console.error('Change review status error:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

/**
 * DELETE /api/v1/admin/reviews/:id
 * Delete review
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await queryOne('SELECT app_id FROM reviews WHERE id = $1', [reviewId]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await queryRun('DELETE FROM reviews WHERE id = $1', [reviewId]);
    await recalculateAppRating(review.app_id);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

/**
 * POST /api/v1/admin/reviews/:id/respond
 * Post official response to a review
 */
router.post('/reviews/:id/respond', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    await queryRun(`
      UPDATE reviews
      SET admin_response = $1, admin_responded_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [response.trim(), reviewId]);

    res.json({ message: 'Response posted successfully' });
  } catch (err) {
    console.error('Respond review error:', err);
    res.status(500).json({ error: 'Failed to post response' });
  }
});

/**
 * GET /api/v1/admin/downloads
 * Download metrics breakdown
 */
router.get('/downloads', async (req, res) => {
  try {
    const topApps = await queryAll(`
      SELECT a.id, a.name, a.slug, a.icon_url, a.total_downloads, c.name as category
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'approved'
      ORDER BY a.total_downloads DESC
      LIMIT 10
    `);

    const dailyTrend = await queryAll(`
      SELECT downloaded_at::date as date, COUNT(*)::int as count
      FROM download_logs
      WHERE downloaded_at >= NOW() - INTERVAL '30 days'
      GROUP BY downloaded_at::date
      ORDER BY date ASC
    `);

    res.json({ topApps, dailyTrend });
  } catch (err) {
    console.error('Admin downloads error:', err);
    res.status(500).json({ error: 'Failed to fetch download metrics' });
  }
});

/**
 * GET /api/v1/admin/settings
 * Read store settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settingsRows = await queryAll('SELECT * FROM store_settings');
    const settings = {};
    settingsRows.forEach(s => { settings[s.key] = s.value; });
    res.json({ settings });
  } catch (err) {
    console.error('Read settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/v1/admin/settings
 * Save store settings
 */
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body;

    await withTransaction(async (client) => {
      for (const [k, v] of Object.entries(updates)) {
        await client.query(`
          INSERT INTO store_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [k, String(v)]);
      }
      await logAdminAction(req.user.id, 'settings_updated', 'settings', null, updates);
    });

    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

/**
 * GET /api/v1/admin/actions
 * Paginated admin audit logs
 */
router.get('/actions', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const totalRow = await queryOne('SELECT COUNT(*)::int as c FROM admin_action_logs');
    const total = totalRow ? totalRow.c : 0;
    const totalPages = Math.ceil(total / limitNum);

    const actions = await queryAll(`
      SELECT l.*, u.display_name as admin_name, u.email as admin_email
      FROM admin_action_logs l
      JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limitNum, offset]);

    res.json({
      actions,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (err) {
    console.error('Admin actions log error:', err);
    res.status(500).json({ error: 'Failed to fetch action logs' });
  }
});

export default router;
