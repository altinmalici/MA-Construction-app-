import { describe, it, expect, vi, beforeAll } from 'vitest';

// supabase-js wird beim Import des Skripts evaluiert — wir mocken es,
// damit kein echter Client erstellt wird.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}));

let _internals;

beforeAll(async () => {
  // Skript braucht ENV-Vars — sonst process.exit(1) beim Import.
  process.env.SUPABASE_URL = 'https://fake.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'fake-service-key';
  ({ _internals } = await import('./migrate-photos-to-storage.mjs'));
});

describe('isBase64', () => {
  it('erkennt data: URLs', () => {
    expect(_internals.isBase64('data:image/jpeg;base64,abc')).toBe(true);
    expect(_internals.isBase64('data:image/png;base64,xyz')).toBe(true);
  });

  it('lehnt Storage-Pfade ab', () => {
    expect(_internals.isBase64('uuid/maengel/uuid/photo.jpg')).toBe(false);
  });

  it('lehnt non-strings ab', () => {
    expect(_internals.isBase64(null)).toBe(false);
    expect(_internals.isBase64(undefined)).toBe(false);
    expect(_internals.isBase64({ blob: 'x' })).toBe(false);
  });
});

describe('dataUrlToBuffer', () => {
  it('parsed JPEG data URL korrekt', () => {
    // 1x1 weißes JPEG (3 Bytes Payload egal — wir testen nur den Parser)
    const dataUrl = 'data:image/jpeg;base64,SGVsbG8='; // "Hello"
    const { mime, buffer } = _internals.dataUrlToBuffer(dataUrl);
    expect(mime).toBe('image/jpeg');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString('utf8')).toBe('Hello');
  });

  it('parsed PNG data URL korrekt', () => {
    const dataUrl = 'data:image/png;base64,QUJD'; // "ABC"
    const { mime, buffer } = _internals.dataUrlToBuffer(dataUrl);
    expect(mime).toBe('image/png');
    expect(buffer.toString('utf8')).toBe('ABC');
  });

  it('lowercased MIME-Type', () => {
    const { mime } = _internals.dataUrlToBuffer('data:IMAGE/JPEG;base64,QUJD');
    expect(mime).toBe('image/jpeg');
  });

  it('wirft bei ungültiger URL', () => {
    expect(() => _internals.dataUrlToBuffer('not a data url')).toThrow();
    expect(() => _internals.dataUrlToBuffer('https://example.com/x.jpg')).toThrow();
  });
});
