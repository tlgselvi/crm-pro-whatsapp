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

async function verifyLogin() {
    const email = env.TEST_USER_EMAIL || 'admin@test.com';
    const password = env.TEST_USER_PASSWORD || '123456';

    console.log(`Verifying login for: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Login Failed:', error.message, 'Status:', error.status);
        process.exit(1);
    } else {
        console.log('Login Successful! User ID:', data.user.id);
        process.exit(0);
    }
}

verifyLogin();
