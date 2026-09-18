export const environment = {
  production: false,
  app: {
    name: 'Enterprise E-Commerce Platform',
    version: '1.0.0',
  },

  api: {
    // This should point to your live backend server (e.g., AWS, DigitalOcean, Heroku)
    // Must match the live backend server URL above
    //baseUrl: 'https://api.your-production-domain.com/api',     
    baseUrl: 'http://localhost:8000/api/v1',
    timeout: 30000,
    razorpayKeyId: 'rzp_test_TOposJGj3ledXf'
  },
  customerRoleId: 'feb417c8-eb19-41e9-9ac9-f0ee08246ad2',
  auth: {
    accessTokenKey: 'access_token',

    refreshTokenKey: 'refresh_token',
  },

  logging: {
    // Keep these false in production so you don't leak data in the browser console
    enableConsole: false,
    enableHttpLogs: false,
  },

  features: {
    enableCaching: true, // You generally want caching enabled in prod
    enableNotifications: true,
    enableDarkTheme: false,
  },
} as const;
