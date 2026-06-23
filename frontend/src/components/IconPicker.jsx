import Icon from './Icon';
import { ICON_GROUPS } from '../lib/icons';

/**
 * Grid icon picker for modals.
 * value    = current icon key (string stored in DB)
 * onChange = (key: string) => void
 */
export default function IconPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ICON_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t3)', marginBottom: 6 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {group.icons.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                style={{
                  width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7,
                  border: `1px solid ${value === key ? 'var(--accent)' : 'var(--b2)'}`,
                  background: value === key ? 'var(--accent-bg)' : 'var(--bg)',
                  color: value === key ? 'var(--accent)' : 'var(--t2)',
                  cursor: 'pointer',
                }}
              >
                <Icon icon={key} size={15} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
