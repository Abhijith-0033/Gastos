import { v2 as cloudinary } from 'cloudinary';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Uploading images to Cloudinary...');
    
    // Upload Icon
    const iconRes = await cloudinary.uploader.upload('E:\\My-APp\\Gastos-logo (1)\\profile.png', {
      folder: 'gastos/icons',
      public_id: 'gastos_icon_' + Date.now()
    });
    console.log('Icon uploaded:', iconRes.secure_url);

    // Upload Banner
    const bannerRes = await cloudinary.uploader.upload('E:\\My-APp\\Gastos-logo (1)\\cover.png', {
      folder: 'gastos/banners',
      public_id: 'gastos_banner_' + Date.now()
    });
    console.log('Banner uploaded:', bannerRes.secure_url);

    console.log('Updating database...');
    await client.connect();
    await client.query('UPDATE apps SET icon_url = $1, banner_url = $2 WHERE slug = $3', [
      iconRes.secure_url,
      bannerRes.secure_url,
      'gastos-expense-tracker'
    ]);
    console.log('Database updated successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
