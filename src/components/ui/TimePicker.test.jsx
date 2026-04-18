import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimePicker, {
  parseTime,
  formatTime,
  minuteOptions,
  snapMinute,
} from './TimePicker.jsx';

describe('TimePicker helpers', () => {
  it('minuteOptions(30) returns [0, 30]', () => {
    expect(minuteOptions(30)).toEqual([0, 30]);
  });

  it('minuteOptions(15) returns [0, 15, 30, 45]', () => {
    expect(minuteOptions(15)).toEqual([0, 15, 30, 45]);
  });

  it('parseTime("08:30") returns {h:8, m:30}', () => {
    expect(parseTime('08:30')).toEqual({ h: 8, m: 30 });
  });

  it('parseTime garbage returns {h:0, m:0}', () => {
    expect(parseTime('')).toEqual({ h: 0, m: 0 });
    expect(parseTime(undefined)).toEqual({ h: 0, m: 0 });
    expect(parseTime('nope')).toEqual({ h: 0, m: 0 });
  });

  it('formatTime(8, 30) → "08:30" with zero-pad', () => {
    expect(formatTime(8, 30)).toBe('08:30');
    expect(formatTime(0, 0)).toBe('00:00');
    expect(formatTime(23, 0)).toBe('23:00');
  });

  it('snapMinute(15, 30) snaps UP to 30 (next valid minute)', () => {
    expect(snapMinute(15, 30)).toBe(30);
  });

  it('snapMinute(45, 30) snaps to 30 (closest existing option, no wrap)', () => {
    expect(snapMinute(45, 30)).toBe(30);
  });

  it('snapMinute(0, 30) stays at 0', () => {
    expect(snapMinute(0, 30)).toBe(0);
  });
});

describe('TimePicker component', () => {
  it('renders 24 hour options when minuteStep=30', () => {
    render(<TimePicker value="08:30" onChange={() => {}} minuteStep={30} />);
    // jeder Stunden-Wert von 00 bis 23 muss als Text vorkommen
    for (let h = 0; h < 24; h++) {
      const label = String(h).padStart(2, '0');
      const matches = screen.getAllByText(label);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it('renders 2 minute options when minuteStep=30', () => {
    render(<TimePicker value="08:30" onChange={() => {}} minuteStep={30} />);
    // Stunden- und Minuten-Wheel sind beide listbox; Minuten ist das zweite.
    const wheels = screen.getAllByRole('listbox');
    expect(wheels).toHaveLength(2);
    const minuteOpts = wheels[1].querySelectorAll('[role="option"]');
    const minuteLabels = Array.from(minuteOpts).map((el) =>
      el.textContent.trim(),
    );
    expect(minuteLabels).toEqual(['00', '30']);
  });

  it('marks the selected hour and minute as aria-selected', () => {
    render(<TimePicker value="08:30" onChange={() => {}} minuteStep={30} />);
    const selected = screen.getAllByRole('option', { selected: true });
    const labels = selected.map((el) => el.textContent.trim());
    expect(labels).toContain('08');
    expect(labels).toContain('30');
  });

  it('snaps invalid minute on render via value normalization (08:15 → 08:30 effective)', () => {
    // Der Component selbst zeigt den nächsten gültigen Slot zentriert.
    render(<TimePicker value="08:15" onChange={() => {}} minuteStep={30} />);
    const selected = screen.getAllByRole('option', { selected: true });
    const labels = selected.map((el) => el.textContent.trim());
    expect(labels).toContain('08');
    expect(labels).toContain('30');
  });
});
