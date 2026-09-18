export const environment = {
  production: false,
  app: {
    name: 'Enterprise E-Commerce Platform',
    version: '1.0.0',
  },

  api: {
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
    enableConsole: true,
    enableHttpLogs: true,
  },

  features: {
    enableCaching: true,

    enableNotifications: true,

    enableDarkTheme: false,
  },
} as const;
