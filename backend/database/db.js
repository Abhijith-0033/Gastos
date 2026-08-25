import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'appstore.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database connection using Node 22 native DatabaseSync
export const db = new DatabaseSync(dbPath);

// Helper for PRAGMA execution
db.pragma = (pragmaStr) => {
  try {
    db.exec(`PRAGMA ${pragmaStr};`);
  } catch (err) {
    console.warn(`Pragma warning (${pragmaStr}):`, err.message);
  }
};

// Helper for atomic transactions
db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

// Enable WAL mode & Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'developer', 'user')),
      display_name TEXT NOT NULL,
      bio TEXT,
      website TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Apps table
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      average_rating REAL NOT NULL DEFAULT 0.0,
      total_views INTEGER NOT NULL DEFAULT 0,
      current_version TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      apk_size_bytes INTEGER NOT NULL,
      icon_url TEXT NOT NULL,
      banner_url TEXT,
      admin_notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejected_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- App tags
    CREATE TABLE IF NOT EXISTS app_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      UNIQUE(app_id, tag)
    );

    -- App screenshots
    CREATE TABLE IF NOT EXISTS app_screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- App videos
    CREATE TABLE IF NOT EXISTS app_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- App permissions
    CREATE TABLE IF NOT EXISTS app_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      reason TEXT,
      is_dangerous INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- App versions history
    CREATE TABLE IF NOT EXISTS app_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      version_name TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      apk_url TEXT NOT NULL,
      apk_size_bytes INTEGER NOT NULL,
      min_android_version TEXT NOT NULL DEFAULT '6.0',
      whats_new TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      is_current INTEGER NOT NULL DEFAULT 0,
      admin_notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejected_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reviews table
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      admin_responded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Download logs
    CREATE TABLE IF NOT EXISTS download_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      version_id INTEGER REFERENCES app_versions(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ip_address TEXT,
      user_agent TEXT,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- In-app notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('app_approved', 'app_rejected', 'version_approved', 'version_rejected', 'new_review', 'info', 'warning')),
      is_read INTEGER NOT NULL DEFAULT 0,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin audit trail
    CREATE TABLE IF NOT EXISTS admin_action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store key-value settings
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

export function seedDatabase(force = false) {
  initDatabase();

  if (!force) {
    const userRow = db.prepare('SELECT COUNT(*) as c FROM users').get();
    if (userRow && userRow.c > 0) {
      console.log('Database already initialized. Skipping seed.');
      return;
    }
  }

  console.log('Initializing database with clean authentic data & Gastos App...');

  // Ensure upload subdirectories exist
  const baseUpload = path.join(__dirname, '..', 'uploads');
  const dirs = ['icons', 'banners', 'screenshots', 'videos', 'apks'];
  dirs.forEach(d => {
    const p = path.join(baseUpload, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  const seedTransaction = db.transaction(() => {
    if (force) {
      // Clear existing records
      db.exec(`
        DELETE FROM download_logs;
        DELETE FROM reviews;
        DELETE FROM notifications;
        DELETE FROM admin_action_logs;
        DELETE FROM app_permissions;
        DELETE FROM app_videos;
        DELETE FROM app_screenshots;
        DELETE FROM app_tags;
        DELETE FROM app_versions;
        DELETE FROM apps;
        DELETE FROM categories;
        DELETE FROM users;
        DELETE FROM store_settings;
      `);
    }

    // 1. Create Core Accounts
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@2026', salt);
    const devPass = bcrypt.hashSync('Developer@2026', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, display_name, bio, website)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'admin',
      'admin@gastosstore.com',
      adminPass,
      'admin',
      'Gastos Store Admin',
      'Administrator of Gastos App Store',
      'https://gastosstore.com'
    );

    const devUser = insertUser.run(
      'gastos_dev',
      'developer@gastos.com',
      devPass,
      'developer',
      'Gastos Team',
      'Creators of smart, intuitive personal finance and expense tracking tools for India.',
      'https://gastos.in'
    );

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

    const insertCat = db.prepare(`
      INSERT INTO categories (name, slug, icon, description, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    categories.forEach(c => insertCat.run(c.name, c.slug, c.icon, c.description, c.sort_order));
    const financeCatId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('finance').id;

    // 3. Copy Real Assets for Gastos App
    const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
    let apkSize = 134915612;
    let apkDestRel = '/uploads/apks/gastos-v1.0.0.apk';
    let iconDestRel = '/uploads/icons/gastos-icon.png';
    let bannerDestRel = '/uploads/banners/gastos-banner.png';
    let videoDestRel = '/uploads/videos/gastos-preview.mp4';
    const screenshotRels = [];

    // Copy APK
    const srcApk = path.join(workspaceRoot, 'Gastos.apk');
    const destApk = path.join(baseUpload, 'apks', 'gastos-v1.0.0.apk');
    if (fs.existsSync(srcApk)) {
      try {
        fs.copyFileSync(srcApk, destApk);
        apkSize = fs.statSync(destApk).size;
      } catch (err) {
        console.warn('Could not copy Gastos.apk:', err.message);
      }
    } else if (fs.existsSync(destApk)) {
      apkSize = fs.statSync(destApk).size;
    }

    // Copy Icon
    const srcIcon = path.join(workspaceRoot, 'Gastos-logo (1)', 'profile.png');
    const destIcon = path.join(baseUpload, 'icons', 'gastos-icon.png');
    if (fs.existsSync(srcIcon)) {
      fs.copyFileSync(srcIcon, destIcon);
    }

    // Copy Banner
    const srcBanner = path.join(workspaceRoot, 'Gastos-logo (1)', 'cover.png');
    const destBanner = path.join(baseUpload, 'banners', 'gastos-banner.png');
    if (fs.existsSync(srcBanner)) {
      fs.copyFileSync(srcBanner, destBanner);
    }

    // Copy Video
    const srcVideo = path.join(workspaceRoot, 'video.mp4');
    const destVideo = path.join(baseUpload, 'videos', 'gastos-preview.mp4');
    if (fs.existsSync(srcVideo)) {
      try {
        fs.copyFileSync(srcVideo, destVideo);
      } catch (err) {
        console.warn('Could not copy video.mp4:', err.message);
      }
    }

    // Copy Screenshots
    const srcImagesDir = path.join(workspaceRoot, 'Images');
    if (fs.existsSync(srcImagesDir)) {
      const files = fs.readdirSync(srcImagesDir);
      files.forEach((f, idx) => {
        if (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')) {
          const destName = `screenshot-${idx + 1}.jpeg`;
          const destPath = path.join(baseUpload, 'screenshots', destName);
          fs.copyFileSync(path.join(srcImagesDir, f), destPath);
          screenshotRels.push(`/uploads/screenshots/${destName}`);
        }
      });
    } else {
      // Check existing in uploads
      const existingSsDir = path.join(baseUpload, 'screenshots');
      if (fs.existsSync(existingSsDir)) {
        const files = fs.readdirSync(existingSsDir);
        files.forEach((f) => {
          if (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')) {
            screenshotRels.push(`/uploads/screenshots/${f}`);
          }
        });
      }
    }

    // 4. Pre-seed Gastos App with real starting metrics (0 downloads, 0 reviews, 0 rating, 0 views)
    const gastosAppResult = db.prepare(`
      INSERT INTO apps (
        developer_id, name, slug, package_name, tagline, description,
        category_id, content_rating, min_android_version, status,
        is_featured, is_editors_choice, featured_order, total_downloads,
        total_reviews, average_rating, total_views, current_version,
        version_code, apk_size_bytes, icon_url, banner_url, submitted_at, approved_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'approved',
        1, 1, 1, 0,
        0, 0.0, 0, '1.0.0',
        1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      devUser.lastInsertRowid,
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
      apkSize,
      iconDestRel,
      bannerDestRel
    );

    const gastosAppId = gastosAppResult.lastInsertRowid;

    // 5. Add Tags
    const tags = ['Finance', 'Expense Tracker', 'Budget', 'Money Manager', 'EMI Planner', 'India', 'Offline', 'UPI', 'Net Worth'];
    const insertTag = db.prepare('INSERT INTO app_tags (app_id, tag) VALUES (?, ?)');
    tags.forEach(t => insertTag.run(gastosAppId, t));

    // 6. Add Screenshots
    const insertScreenshot = db.prepare('INSERT INTO app_screenshots (app_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
    screenshotRels.forEach((url, idx) => {
      insertScreenshot.run(gastosAppId, url, `Gastos App Screen ${idx + 1}`, idx + 1);
    });

    // 7. Add Video
    if (fs.existsSync(destVideo)) {
      db.prepare('INSERT INTO app_videos (app_id, url, thumbnail_url, sort_order) VALUES (?, ?, ?, ?)')
        .run(gastosAppId, videoDestRel, bannerDestRel, 1);
    }

    // 8. Add Permissions
    const permissions = [
      { permission: 'INTERNET', reason: 'Used for backup sync and exchange rate updates', dangerous: 0 },
      { permission: 'VIBRATE', reason: 'Tactile haptic feedback on numeric keypad input', dangerous: 0 },
      { permission: 'RECEIVE_BOOT_COMPLETED', reason: 'Schedule local daily expense and EMI reminder notifications', dangerous: 0 },
      { permission: 'USE_BIOMETRIC', reason: 'Fingerprint and Face Unlock security for private financial records', dangerous: 0 },
      { permission: 'READ_EXTERNAL_STORAGE', reason: 'Export and import PDF / Excel transaction statements', dangerous: 1 },
      { permission: 'WRITE_EXTERNAL_STORAGE', reason: 'Save local backup snapshots to internal storage', dangerous: 1 }
    ];

    const insertPerm = db.prepare('INSERT INTO app_permissions (app_id, permission, reason, is_dangerous) VALUES (?, ?, ?, ?)');
    permissions.forEach(p => insertPerm.run(gastosAppId, p.permission, p.reason, p.dangerous));

    // 9. Add Version 1.0.0
    db.prepare(`
      INSERT INTO app_versions (
        app_id, version_name, version_code, apk_url, apk_size_bytes,
        min_android_version, whats_new, status, is_current, submitted_at, approved_at
      ) VALUES (
        ?, '1.0.0', 1, ?, ?,
        '6.0', '🚀 Initial Public Launch! Full expense tracking, budget goals, EMI calculation, and analytics dashboard.',
        'approved', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(gastosAppId, apkDestRel, apkSize);

    // 10. Add Store Settings
    const insertSetting = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?)');
    insertSetting.run('store_name', 'Gastos App Store');
    insertSetting.run('store_tagline', 'Premium Android Apps, Carefully Reviewed');
    insertSetting.run('require_review_approval', 'false');
    insertSetting.run('max_apk_size_mb', '150');
    insertSetting.run('max_screenshots', '8');
    insertSetting.run('maintenance_mode', 'false');
  });

  seedTransaction();
  console.log('Database initialized cleanly without mock data!');
}

// Auto-init schema on module load
initDatabase();
