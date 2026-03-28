import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });

async function run() {
    const sql = fs.readFileSync('supabase/fresh_database.sql', 'utf8');
    console.log('Running migration...');
    try {
        await pool.query(sql);
        console.log('Migration successful');
    } catch (e) {
        console.error('Migration failed', e);
    } finally {
        pool.end();
    }
}
run();
