import { pool } from './database/db.js';

async function fixUrls() {
  try {
    const iconUrl = 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?q=80&w=256&auto=format&fit=crop';
    const bannerUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop';
    
    // Set a safe fallback URL for the APK download since the Cloudinary account is empty
    const apkUrl = 'https://gastos.in'; 
    
    await pool.query('UPDATE apps SET icon_url = $1, banner_url = $2 WHERE slug = $3', [iconUrl, bannerUrl, 'gastos-expense-tracker']);
    await pool.query('UPDATE app_versions SET apk_url = $1 WHERE app_id = 1', [apkUrl]);
    
    console.log('Successfully updated URLs in Neon DB!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixUrls();
