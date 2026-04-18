export const minuteOptions = (step) => {
  const arr = [];
  for (let i = 0; i < 60; i += step) arr.push(i);
  return arr;
};

export const parseTime = (s) => {
  if (!/^\d{2}:\d{2}$/.test(s || "")) return { h: 0, m: 0 };
  const [h, m] = s.split(":").map(Number);
  return {
    h: Math.min(23, Math.max(0, h)),
    m: Math.min(59, Math.max(0, m)),
  };
};

export const formatTime = (h, m) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

// Bei Gleichstand: die nächst-höhere Option (z.B. 15 → 30 bei step=30).
export const snapMinute = (m, step) => {
  const opts = minuteOptions(step);
  return opts.reduce(
    (best, o) => (Math.abs(o - m) <= Math.abs(best - m) ? o : best),
    opts[0],
  );
};
