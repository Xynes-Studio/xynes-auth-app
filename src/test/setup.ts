import '@testing-library/jest-dom/vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com';
process.env.NEXT_PUBLIC_APP_URL = 'https://auth.test.com';
process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS = 'xynes.com,localhost:3000,localhost:3001';
