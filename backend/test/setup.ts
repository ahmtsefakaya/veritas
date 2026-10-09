process.env.OPENAI_API_KEY ||= 'test-only-key';
process.env.DATABASE_URL ||= 'postgresql://postgres:dev@localhost:55432/veritas?schema=public';
process.env.REDIS_URL ||= 'redis://localhost:56379';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
