import { describe, it, expect } from 'vitest';
import { _internals } from './storage.js';

const { sanitizeFilename, mimeToExtension } = _internals;

describe('sanitizeFilename', () => {
  it('behält einfache Namen', () => {
    expect(sanitizeFilename('rechnung.pdf')).toBe('rechnung.pdf');
  });
  it('ersetzt Umlaute', () => {
    expect(sanitizeFilename('Angebot Müller.pdf')).toBe('Angebot-Mueller.pdf');
  });
  it('entfernt URL-kritische Zeichen', () => {
    expect(sanitizeFilename('file (2)/backup.pdf')).toBe('file-2-backup.pdf');
  });
  it('behandelt Dateien ohne Extension', () => {
    expect(sanitizeFilename('README')).toBe('README');
  });
  it('kollabiert mehrfache Bindestriche', () => {
    expect(sanitizeFilename('a---b.pdf')).toBe('a-b.pdf');
  });
  it('entfernt führende/nachfolgende Bindestriche', () => {
    expect(sanitizeFilename('-test-.pdf')).toBe('test.pdf');
  });
  it('kürzt sehr lange Namen auf max 100 + .ext', () => {
    const long = 'a'.repeat(200) + '.pdf';
    const result = sanitizeFilename(long);
    expect(result.length).toBeLessThanOrEqual(104);
    expect(result.endsWith('.pdf')).toBe(true);
  });
  it('fallback auf "datei" bei leerem Input', () => {
    expect(sanitizeFilename('')).toBe('datei');
    expect(sanitizeFilename(null)).toBe('datei');
    expect(sanitizeFilename(undefined)).toBe('datei');
  });
  it('Extension wird lowercase', () => {
    expect(sanitizeFilename('Vertrag.PDF')).toBe('Vertrag.pdf');
  });
  it('Whitespace + non-alphanumerische Zeichen werden aus Extension gestrippt', () => {
    expect(sanitizeFilename('file.p df')).toBe('file.pdf');
  });
});

describe('mimeToExtension', () => {
  it('mappt bekannte Image-MIMEs', () => {
    expect(mimeToExtension('image/jpeg')).toBe('jpg');
    expect(mimeToExtension('image/png')).toBe('png');
    expect(mimeToExtension('image/webp')).toBe('webp');
  });
  it('returnt null bei unbekanntem MIME', () => {
    expect(mimeToExtension('application/pdf')).toBe(null);
    expect(mimeToExtension('')).toBe(null);
    expect(mimeToExtension(undefined)).toBe(null);
  });
});
