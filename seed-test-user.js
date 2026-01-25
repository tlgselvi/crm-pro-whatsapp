const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
const env = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
    const email = env.TEST_USER_EMAIL || 'admin@test.com';
    const password = env.TEST_USER_PASSWORD || '123456';

    console.log(`Ensuring test user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        if (error.message.includes('User already registered') || error.status === 400) {
            console.log('User status checked. Likely already exists or requires existing sign-in.');
        } else {
            console.error('Supabase Error:', error.message);
        }
    } else {
        console.log('User created or sign-up initiated!');
    }
}

createTestUser();
