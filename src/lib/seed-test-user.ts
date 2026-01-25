import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
    const email = process.env.TEST_USER_EMAIL || 'admin@test.com';
    const password = process.env.TEST_USER_PASSWORD || '123456';

    console.log(`Creating test user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        if (error.message.includes('User already registered')) {
            console.log('User already exists. Good to go!');
        } else {
            console.error('Error creating user:', error.message);
        }
    } else {
        console.log('User created successfully!');
    }
}

createTestUser();
