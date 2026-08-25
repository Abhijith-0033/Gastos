import { Router } from 'express';
import { db } from '../database/db.js';

const router = Router();

/**
 * GET /api/v1/developers/:username
 * Public developer profile and list of published apps
 */
router.get('/:username', (req, res) => {
  const { username } = req.params;

  const developer = db.prepare(`
    SELECT
      id, username, display_name, bio, website, avatar_url,
      strftime('%Y', created_at) as developer_since,
      (SELECT COUNT(*) FROM apps WHERE developer_id = users.id AND status = 'approved') as total_published_apps,
      (SELECT COALESCE(SUM(total_downloads), 0) FROM apps WHERE developer_id = users.id AND status = 'approved') as total_downloads
    FROM users
    WHERE username = ? AND is_active = 1
  `).get(username);

  if (!developer) {
    return res.status(404).json({ error: 'Developer profile not found.' });
  }

  const apps = db.prepare(`
    SELECT
      a.id, a.name, a.slug, a.icon_url, a.average_rating,
      a.total_reviews, a.total_downloads, a.current_version,
      c.name as category
    FROM apps a
    JOIN categories c ON a.category_id = c.id
    WHERE a.developer_id = ? AND a.status = 'approved'
    ORDER BY a.total_downloads DESC
  `).all(developer.id);

  res.json({
    developer,
    apps,
  });
});

export default router;
