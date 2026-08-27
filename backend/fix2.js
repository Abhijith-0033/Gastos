import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  try {
    await client.connect();
    const iconUrl = 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?q=80&w=256&auto=format&fit=crop';
    const bannerUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop';
    const apkUrl = 'https://gastos.in';
    
    await client.query('UPDATE apps SET icon_url = $1, banner_url = $2 WHERE slug = $3', [iconUrl, bannerUrl, 'gastos-expense-tracker']);
    await client.query('UPDATE app_versions SET apk_url = $1 WHERE app_id = 1', [apkUrl]);
    console.log('Fixed!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
