import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL environment variable is missing.');
}

// Create PostgreSQL connection pool
export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL Pool Error:', err);
});

/**
 * Execute query and return single row
 */
export async function queryOne(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

/**
 * Execute query and return all matching rows
 */
export async function queryAll(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

/**
 * Execute insert/update/delete query and return query result
 */
export async function queryRun(text, params = []) {
  return pool.query(text, params);
}

/**
 * Transaction wrapper with automated BEGIN / COMMIT / ROLLBACK
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initialize PostgreSQL Schema
 */
export async function initDatabase() {
  await pool.query(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'developer', 'user')),
      display_name TEXT NOT NULL,
      bio TEXT,
      website TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Apps table
    CREATE TABLE IF NOT EXISTS apps (
      id SERIAL PRIMARY KEY,
      developer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      package_name TEXT UNIQUE NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      content_rating TEXT NOT NULL DEFAULT 'Everyone' CHECK (content_rating IN ('Everyone', '12+', '16+', '18+')),
      min_android_version TEXT NOT NULL DEFAULT '6.0',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_editors_choice INTEGER NOT NULL DEFAULT 0,
      featured_order INTEGER DEFAULT 0,
      total_downloads INTEGER NOT NULL DEFAULT 0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      average_rating NUMERIC(3,1) NOT NULL DEFAULT 0.0,
      total_views INTEGER NOT NULL DEFAULT 0,
      current_version TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      apk_size_bytes BIGINT NOT NULL,
      icon_url TEXT NOT NULL,
      banner_url TEXT,
      admin_notes TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE,
      rejected_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- App tags
    CREATE TABLE IF NOT EXISTS app_tags (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      UNIQUE(app_id, tag)
    );

    -- App screenshots
    CREATE TABLE IF NOT EXISTS app_screenshots (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- App videos
    CREATE TABLE IF NOT EXISTS app_videos (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- App permissions
    CREATE TABLE IF NOT EXISTS app_permissions (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      reason TEXT,
      is_dangerous INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- App versions history
    CREATE TABLE IF NOT EXISTS app_versions (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      version_name TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      apk_url TEXT NOT NULL,
      apk_size_bytes BIGINT NOT NULL,
      min_android_version TEXT NOT NULL DEFAULT '6.0',
      whats_new TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      is_current INTEGER NOT NULL DEFAULT 0,
      admin_notes TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE,
      rejected_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Reviews table
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_email TEXT,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT,
      body TEXT,
      device_info TEXT,
      is_verified_download INTEGER NOT NULL DEFAULT 0,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected', 'flagged')),
      admin_response TEXT,
      admin_responded_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Download logs
    CREATE TABLE IF NOT EXISTS download_logs (
      id SERIAL PRIMARY KEY,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      version_id INTEGER REFERENCES app_versions(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ip_address TEXT,
      user_agent TEXT,
      downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- In-app notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('app_approved', 'app_rejected', 'version_approved', 'version_rejected', 'new_review', 'info', 'warning')),
      is_read INTEGER NOT NULL DEFAULT 0,
      data TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Admin audit trail
    CREATE TABLE IF NOT EXISTS admin_action_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Store key-value settings
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
    CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category_id);
    CREATE INDEX IF NOT EXISTS idx_apps_developer ON apps(developer_id);
    CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
    CREATE INDEX IF NOT EXISTS idx_apps_pkg ON apps(package_name);
    CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(is_featured);
    CREATE INDEX IF NOT EXISTS idx_apps_editors ON apps(is_editors_choice);
    CREATE INDEX IF NOT EXISTS idx_reviews_app ON reviews(app_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_downloads_app ON download_logs(app_id);
    CREATE INDEX IF NOT EXISTS idx_downloads_date ON download_logs(downloaded_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);
}

/**
 * Seed database with initial system records
 */
export async function seedDatabase(force = false) {
  await initDatabase();

  if (!force) {
    const userRow = await queryOne('SELECT COUNT(*)::int as c FROM users');
    if (userRow && userRow.c > 0) {
      console.log('PostgreSQL database already initialized. Skipping seed.');
      return;
    }
  }

  console.log('Initializing PostgreSQL database with authentic data & Gastos App...');

  await withTransaction(async (client) => {
    if (force) {
      await client.query(`
        TRUNCATE download_logs, reviews, notifications, admin_action_logs, 
                 app_permissions, app_videos, app_screenshots, app_tags, 
                 app_versions, apps, categories, users, store_settings RESTART IDENTITY CASCADE;
      `);
    }

    // 1. Create Core Accounts
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@2026', salt);
    const devPass = bcrypt.hashSync('Developer@2026', salt);

    const adminUserRes = await client.query(
      `INSERT INTO users (username, email, password_hash, role, display_name, bio, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['admin', 'admin@gastosstore.com', adminPass, 'admin', 'Gastos Store Admin', 'Administrator of Gastos App Store', 'https://gastosstore.com']
    );

    const devUserRes = await client.query(
      `INSERT INTO users (username, email, password_hash, role, display_name, bio, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['gastos_dev', 'developer@gastos.com', devPass, 'developer', 'Gastos Team', 'Creators of smart, intuitive personal finance and expense tracking tools for India.', 'https://gastos.in']
    );

    const devUserId = devUserRes.rows[0].id;

    // 2. Create Categories
    const categories = [
      { name: 'Finance', slug: 'finance', icon: '💰', description: 'Budgeting, expense tracking, taxes, and money management tools', sort_order: 1 },
      { name: 'Productivity', slug: 'productivity', icon: '⚡', description: 'Organize your day, take notes, and get things done', sort_order: 2 },
      { name: 'Tools', slug: 'tools', icon: '🔧', description: 'Utilities and daily helper applications', sort_order: 3 },
      { name: 'Education', slug: 'education', icon: '📚', description: 'Learn new skills, languages, and subjects', sort_order: 4 },
      { name: 'Health', slug: 'health', icon: '❤️', description: 'Fitness, wellness, habit, and diet trackers', sort_order: 5 },
      { name: 'Entertainment', slug: 'entertainment', icon: '🎬', description: 'Music, videos, and fun digital experiences', sort_order: 6 },
      { name: 'Games', slug: 'games', icon: '🎮', description: 'Casual, puzzle, and strategic mobile games', sort_order: 7 },
      { name: 'Social', slug: 'social', icon: '👥', description: 'Connect, share, and chat with communities', sort_order: 8 },
      { name: 'Shopping', slug: 'shopping', icon: '🛍️', description: 'Deals, coupons, and curated shopping apps', sort_order: 9 },
      { name: 'Travel', slug: 'travel', icon: '✈️', description: 'Trip planning, navigation, and local guides', sort_order: 10 },
    ];

    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, icon, description, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        [c.name, c.slug, c.icon, c.description, c.sort_order]
      );
    }

    const finCatRes = await client.query(`SELECT id FROM categories WHERE slug = $1`, ['finance']);
    const financeCatId = finCatRes.rows[0].id;

    // 3. Gastos App Default Data
    const iconUrl = 'https://res.cloudinary.com/lyye3rqw/image/upload/v1724750000/gastos/icon.png';
    const bannerUrl = 'https://res.cloudinary.com/lyye3rqw/image/upload/v1724750000/gastos/banner.png';
    const apkUrl = 'https://res.cloudinary.com/lyye3rqw/raw/upload/v1724750000/gastos/Gastos.apk';

    const gastosAppResult = await client.query(
      `INSERT INTO apps (
        developer_id, name, slug, package_name, tagline, description,
        category_id, content_rating, min_android_version, status,
        is_featured, is_editors_choice, featured_order, total_downloads,
        total_reviews, average_rating, total_views, current_version,
        version_code, apk_size_bytes, icon_url, banner_url, submitted_at, approved_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, 'approved',
        1, 1, 1, 0,
        0, 0.0, 0, '1.0.0',
        1, $10, $11, $12, NOW(), NOW()
      ) RETURNING id`,
      [
        devUserId,
        'Gastos — Smart Expense Tracker & Finance Manager',
        'gastos-expense-tracker',
        'com.gastos.app',
        'Smart Indian Expense & Budget Tracker with Multi-Account & EMI Planning',
        `Gastos is India's most comprehensive, offline-first personal expense tracker and budget planner. Built with precision for Indian financial habits, Gastos empowers you to take complete control of your finances without invasive permissions or complex spreadsheets.

**Key Features:**
• **Multi-Account Tracking**: Manage Bank Accounts, UPI Wallets, Cash, Credit Cards, and Savings in one unified dashboard.
• **Smart Budgeting**: Set monthly category-wise budgets with real-time progress bars and proactive overspending warnings.
• **EMI & Loan Planner**: Track your ongoing loans, interest amortizations, and upcoming monthly EMI schedules with automatic payment reminders.
• **Chit Fund & Debt Management**: Specially tailored for Indian savings circles and tracking informal money lent/borrowed.
• **Visual Financial Analytics**: Deep interactive charts showing monthly spending breakdowns, cash flow trends, and net worth progression.
• **100% Privacy & Offline**: Your sensitive financial data resides safely on your local device. No third-party data selling.
• **Dark Mode & Intuitive UI**: Beautiful, battery-friendly interface designed for speed and clarity.`,
        financeCatId,
        'Everyone',
        '6.0',
        134915612,
        iconUrl,
        bannerUrl
      ]
    );

    const gastosAppId = gastosAppResult.rows[0].id;

    // Tags
    const tags = ['Finance', 'Expense Tracker', 'Budget', 'Money Manager', 'EMI Planner', 'India', 'Offline', 'UPI', 'Net Worth'];
    for (const t of tags) {
      await client.query(`INSERT INTO app_tags (app_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [gastosAppId, t]);
    }

    // Permissions
    const permissions = [
      { permission: 'INTERNET', reason: 'Used for backup sync and exchange rate updates', dangerous: 0 },
      { permission: 'VIBRATE', reason: 'Tactile haptic feedback on numeric keypad input', dangerous: 0 },
      { permission: 'RECEIVE_BOOT_COMPLETED', reason: 'Schedule local daily expense and EMI reminder notifications', dangerous: 0 },
      { permission: 'USE_BIOMETRIC', reason: 'Fingerprint and Face Unlock security for private financial records', dangerous: 0 },
      { permission: 'READ_EXTERNAL_STORAGE', reason: 'Export and import PDF / Excel transaction statements', dangerous: 1 },
      { permission: 'WRITE_EXTERNAL_STORAGE', reason: 'Save local backup snapshots to internal storage', dangerous: 1 }
    ];

    for (const p of permissions) {
      await client.query(
        `INSERT INTO app_permissions (app_id, permission, reason, is_dangerous) VALUES ($1, $2, $3, $4)`,
        [gastosAppId, p.permission, p.reason, p.dangerous]
      );
    }

    // Version 1.0.0
    await client.query(
      `INSERT INTO app_versions (
        app_id, version_name, version_code, apk_url, apk_size_bytes,
        min_android_version, whats_new, status, is_current, submitted_at, approved_at
      ) VALUES (
        $1, '1.0.0', 1, $2, $3,
        '6.0', '🚀 Initial Public Launch! Full expense tracking, budget goals, EMI calculation, and analytics dashboard.',
        'approved', 1, NOW(), NOW()
      )`,
      [gastosAppId, apkUrl, 134915612]
    );

    // Store settings
    const settings = [
      ['store_name', 'Gastos App Store'],
      ['store_tagline', 'Premium Android Apps, Carefully Reviewed'],
      ['require_review_approval', 'false'],
      ['max_apk_size_mb', '150'],
      ['max_screenshots', '8'],
      ['maintenance_mode', 'false'],
    ];

    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO store_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }
  });

  console.log('PostgreSQL database initialized cleanly with default data!');
}
