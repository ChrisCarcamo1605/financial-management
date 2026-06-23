/* Lightweight dependency-free SVG charts, themed via CSS vars. */
import Icon from '../Icon';

function buildPath(points, w, h, pad = 8) {
  if (!points.length) return { line: '', area: '' };
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
  return { line, area, last: coords[coords.length - 1] };
}

export function AreaLineChart({ points = [], labels = [], color = 'var(--accent)', height = 180 }) {
  const W = 660;
  const H = 180;
  const { line, area, last } = buildPath(points, W, H, 14);
  const gid = `g${Math.abs(points.reduce((a, b) => a + b, 0)).toString(36)}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="var(--border)" strokeWidth="1" />
        ))}
        {area && <path d={area} fill={`url(#${gid})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {last && <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="var(--bg)" strokeWidth="2" />}
      </svg>
      {labels.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {labels.map((l, i) => (
            <span key={i} style={{ fontSize: 10.5, color: i === labels.length - 1 ? 'var(--accent)' : 'var(--t3)', fontWeight: i === labels.length - 1 ? 600 : 400 }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MultiLineChart({ series = [], labels = [], height = 200 }) {
  const W = 720;
  const H = 200;
  const all = series.flatMap((s) => s.points);
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  const range = max - min || 1;
  const pad = 16;
  const toPath = (pts) => {
    const stepX = pts.length > 1 ? (W - pad * 2) / (pts.length - 1) : 0;
    return pts
      .map((v, i) => {
        const x = pad + i * stepX;
        const y = pad + (1 - (v - min) / range) * (H - pad * 2);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="var(--border)" strokeWidth="1" />
        ))}
        {series.map((s, i) => (
          <path key={i} d={toPath(s.points)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {labels.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {labels.map((l, i) => (
            <span key={i} style={{ fontSize: 10.5, color: 'var(--t3)' }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupedBars({ groups = [], height = 150 }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.bars.map((b) => b.value)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height, paddingTop: 8 }}>
      {groups.map((g, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: height - 30 }}>
            {g.bars.map((b, j) => (
              <div key={j} title={String(b.value)} style={{ width: 14, height: `${(b.value / max) * 100}%`, background: b.color, borderRadius: '3px 3px 0 0', minHeight: 2 }} />
            ))}
          </div>
          <span style={{ fontSize: 10.5, color: g.current ? 'var(--accent)' : 'var(--t3)', fontWeight: g.current ? 600 : 400 }}>{g.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryBars({ items = [] }) {
  const max = Math.max(1, ...items.map((it) => it.value));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
              {it.icon ? (
                <span style={{ width: 18, height: 18, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${it.color} 16%, transparent)`, color: it.color, flexShrink: 0 }}>
                  <Icon icon={it.icon} size={11} />
                </span>
              ) : (
                <span className="dot" style={{ background: it.color, borderRadius: 2, width: 8, height: 8 }} />
              )}
              {it.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }} className="num">{it.label}</span>
          </div>
          <div className="bar-bg" style={{ height: 6 }}>
            <div className="bar-fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ pct = 0, color = 'var(--accent)', size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--b2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <b style={{ fontSize: size > 60 ? 16 : 13, fontWeight: 700 }} className="num">{Math.round(pct)}%</b>
      </div>
    </div>
  );
}

export function Legend({ items = [] }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--t2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
