import { jest } from '@jest/globals';

// Deliberately its own file, with no static top-level import of app.js/anything env-dependent:
// env.js's zod config is parsed once, at first import, and cached for this file's module
// registry — setting RESEND_API_KEY has to happen before that first import, which means using
// jest.unstable_mockModule + a dynamic import() (not hoisted, unlike a static import) rather than
// the beforeAll/afterEach/afterAll + static-import shape every other test file uses.
describe('sendEmail — Resend error-swallowing regression', () => {
  it('throws instead of silently reporting delivered:true when Resend resolves {data:null, error}', async () => {
    process.env.RESEND_API_KEY = 're_test_key_for_this_file_only';

    const mockSend = jest.fn().mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field' },
    });
    jest.unstable_mockModule('resend', () => ({
      Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
    }));

    const { sendEmail } = await import('../src/services/email.service.js');

    await expect(sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Hello' }))
      .rejects.toThrow(/Resend delivery failed/);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
