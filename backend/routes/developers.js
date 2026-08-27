import { Router } from 'express';
import { queryOne, queryAll } from '../database/db.js';

const router = Router();

/**
 * GET /api/v1/developers/:username
 * Public developer profile and list of published apps
 */
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const developer = await queryOne(`
      SELECT
        id, username, display_name, bio, website, avatar_url,
        TO_CHAR(created_at, 'YYYY') as developer_since,
        (SELECT COUNT(*)::int FROM apps WHERE developer_id = users.id AND status = 'approved') as total_published_apps,
        (SELECT COALESCE(SUM(total_downloads), 0)::int FROM apps WHERE developer_id = users.id AND status = 'approved') as total_downloads
      FROM users
      WHERE username = $1 AND is_active = 1
    `, [username]);

    if (!developer) {
      return res.status(404).json({ error: 'Developer profile not found.' });
    }

    const apps = await queryAll(`
      SELECT
        a.id, a.name, a.slug, a.icon_url, a.average_rating,
        a.total_reviews, a.total_downloads, a.current_version,
        c.name as category
      FROM apps a
      JOIN categories c ON a.category_id = c.id
      WHERE a.developer_id = $1 AND a.status = 'approved'
      ORDER BY a.total_downloads DESC
    `, [developer.id]);

    res.json({
      developer,
      apps,
    });
  } catch (err) {
    console.error('Public developer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch developer profile' });
  }
});

export default router;
