const RESULTS = {
  UNAVAILABLE: 'unavailable',
  BLOCKED: 'blocked',
  DENIED: 'denied',
  GRANTED: 'granted',
  LIMITED: 'limited',
};

module.exports = {
  PERMISSIONS: {
    IOS: {},
    ANDROID: {},
  },
  RESULTS,
  check: jest.fn(async () => RESULTS.GRANTED),
  checkNotifications: jest.fn(async () => ({status: RESULTS.GRANTED, settings: {}})),
  openSettings: jest.fn(async () => undefined),
  request: jest.fn(async () => RESULTS.GRANTED),
  requestNotifications: jest.fn(async () => ({
    status: RESULTS.GRANTED,
    settings: {},
  })),
};
