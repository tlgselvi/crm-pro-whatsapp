const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
const envContent = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFreshUser() {
    const email = 'testuser2026@elite.com';
    const password = 'ElitePassword2026!';

    console.log(`Seeding fresh user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        if (error.message.includes('User already registered') || error.status === 400) {
            console.log('User already exists or sign-up blocked. Proceeding with credentials.');
        } else {
            console.error('Seeding Error:', error.message);
        }
    } else {
        console.log('Fresh user seeded successfully!');
    }
}

seedFreshUser();
