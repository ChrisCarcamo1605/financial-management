import React, { useState } from 'react';

// Predefined SVG icons for finance categories
const svgIcons = {
  income: [
    { name: 'Salary', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
    { name: 'Freelance', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
    { name: 'Investment', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>' },
    { name: 'Bonus', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { name: 'Rent', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { name: 'Refund', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' },
    { name: 'Commission', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { name: 'Dividend', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
  ],
  expense: [
    { name: 'Groceries', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' },
    { name: 'Transport', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/><rect x="5" y="4" width="14" height="10" rx="2"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg>' },
    { name: 'Dining', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' },
    { name: 'Entertainment', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' },
    { name: 'Healthcare', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
    { name: 'Shopping', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
    { name: 'Utilities', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 18.36 9 9 0 0 1 18.36 6.64z"/><line x1="12" y1="2" x2="12" y2="12"/></svg>' },
    { name: 'Education', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
    { name: 'Insurance', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { name: 'Travel', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>' },
    { name: 'Subscriptions', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { name: 'Home', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  ],
};

const bootstrapIcons = [
  'cart', 'house', 'car', 'heart', 'star', 'lightning', 'gift',
  'phone', 'music', 'camera', 'book', 'briefcase', 'cup', 'cup-hot',
  'gamepad', 'ticket', 'ticket-perforated', 'ticket-detailed',
  'piggy-bank', 'cash-coin', 'currency-dollar', 'credit-card',
  'bank', 'receipt', 'bag', 'bag-check', 'basket', 'basket2',
  'basket3', 'cart2', 'cart3', 'cart4', 'gift', 'gift-fill',
  'hand-thumbs-up', 'hand-thumbs-down', 'person', 'people',
  'person-badge', 'person-lines-fill', 'person-workspace',
  'person-hearts', 'person-vcard', 'person-arms-up',
  'building', 'buildings', 'building-gear', 'building-lock',
  'building-slash', 'building-x', 'bus-front', 'train-front',
  'bicycle', 'scooter', 'fuel-pump', 'ev-front', 'ev-front-fill',
  'ev-station', 'ev-station-fill', 'signpost', 'signpost-2',
  'signpost-2-fill', 'signpost-fill', 'signpost-split',
  'signpost-split-fill', 'airplane', 'airplane-engines',
  'airplane-engines-fill', 'airplane-fill', 'globe', 'globe-americas',
  'globe-americas-fill', 'globe-europe-africa', 'globe-europe-africa-fill',
  'mortarboard', 'mortarboard-fill', 'book-half', 'books',
  'backpack', 'backpack-fill', 'backpack2', 'backpack2-fill',
  'backpack3', 'backpack3-fill', 'backpack4', 'backpack4-fill',
  'pencil', 'pencil-square', 'pen', 'pen-fill', 'clipboard',
  'clipboard-check', 'clipboard-data', 'clipboard-minus',
  'clipboard-plus', 'clipboard-x', 'file-earmark',
  'file-earmark-check', 'file-earmark-minus', 'file-earmark-plus',
  'file-earmark-x', 'file-earmark-arrow-down',
  'file-earmark-arrow-up', 'file-earmark-bar-graph',
  'file-earmark-binary', 'file-earmark-break', 'file-earmark-code',
  'file-earmark-diff', 'file-earmark-easel', 'file-earmark-excel',
  'file-earmark-font', 'file-earmark-image', 'file-earmark-lock',
  'file-earmark-lock2', 'file-earmark-medical', 'file-earmark-music',
  'file-earmark-pdf', 'file-earmark-person', 'file-earmark-play',
  'file-earmark-plus', 'file-earmark-post', 'file-earmark-ppt',
  'file-earmark-richtext', 'file-earmark-ruled', 'file-earmark-slides',
  'file-earmark-spreadsheet', 'file-earmark-text', 'file-earmark-word',
  'file-earmark-x', 'file-earmark-zip', 'file-earmark',
  'file-earmark-arrow-down', 'file-earmark-arrow-up',
  'file-earmark-bar-graph', 'file-earmark-binary',
  'file-earmark-break', 'file-earmark-check', 'file-earmark-code',
  'file-earmark-diff', 'file-earmark-easel', 'file-earmark-excel',
  'file-earmark-font', 'file-earmark-image', 'file-earmark-lock',
  'file-earmark-lock2', 'file-earmark-medical', 'file-earmark-music',
  'file-earmark-pdf', 'file-earmark-person', 'file-earmark-play',
  'file-earmark-plus', 'file-earmark-post', 'file-earmark-ppt',
  'file-earmark-richtext', 'file-earmark-ruled', 'file-earmark-slides',
  'file-earmark-spreadsheet', 'file-earmark-text', 'file-earmark-word',
  'file-earmark-x', 'file-earmark-zip',
];

const IconPicker = ({ selectedIcon, selectedType, onIconSelect }) => {
  const [activeTab, setActiveTab] = useState(selectedType || 'svg');
  const [activeCategory, setActiveCategory] = useState('income');
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const filteredBootstrap = bootstrapIcons.filter(icon =>
    icon.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSvgIcons = svgIcons[activeCategory]?.filter(icon =>
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div>
      {/* Type tabs */}
      <div className="d-flex gap-2 mb-3">
        {[
          { key: 'svg', label: 'Iconos SVG', icon: 'bi-vector-pen' },
          { key: 'bootstrap', label: 'Bootstrap Icons', icon: 'bi-grid' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: activeTab === tab.key ? (isDark ? '#338dfc' : '#338dfc') : (isDark ? '#334155' : '#f1f5f9'),
              color: activeTab === tab.key ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
              transition: 'all 0.2s',
            }}
          >
            <i className={`bi ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SVG Category tabs */}
      {activeTab === 'svg' && (
        <div className="d-flex gap-2 mb-3">
          {[
            { key: 'income', label: 'Ingresos' },
            { key: 'expense', label: 'Gastos' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                backgroundColor: activeCategory === tab.key ? (isDark ? '#1e293b' : '#e2e8f0') : 'transparent',
                color: activeCategory === tab.key ? (isDark ? '#f1f5f9' : '#0f172a') : (isDark ? '#64748b' : '#94a3b8'),
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar icono..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-lg)',
          border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          background: isDark ? '#0f172a' : 'white',
          color: isDark ? '#f1f5f9' : '#0f172a',
          fontSize: '0.875rem',
          marginBottom: '12px',
          outline: 'none',
        }}
      />

      {/* Icon grid */}
      {activeTab === 'svg' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px',
        }}>
          {filteredSvgIcons.map((item) => (
            <button
              key={item.name}
              onClick={() => onIconSelect(item.icon, 'svg')}
              title={item.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                borderRadius: 'var(--radius-lg)',
                border: selectedIcon === item.icon && selectedType === 'svg'
                  ? `2px solid ${isDark ? '#338dfc' : '#338dfc'}`
                  : `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                background: selectedIcon === item.icon && selectedType === 'svg'
                  ? (isDark ? 'rgba(51, 141, 252, 0.15)' : 'rgba(51, 141, 252, 0.1)')
                  : (isDark ? '#0f172a' : 'white'),
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: isDark ? '#e2e8f0' : '#334155',
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
              <span style={{ fontSize: '0.6875rem', color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center' }}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '6px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px',
        }}>
          {filteredBootstrap.map((iconName) => (
            <button
              key={iconName}
              onClick={() => onIconSelect(iconName, 'bootstrap')}
              title={iconName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 4px',
                borderRadius: 'var(--radius-lg)',
                border: selectedIcon === iconName && selectedType === 'bootstrap'
                  ? `2px solid ${isDark ? '#338dfc' : '#338dfc'}`
                  : `2px solid transparent`,
                background: selectedIcon === iconName && selectedType === 'bootstrap'
                  ? (isDark ? 'rgba(51, 141, 252, 0.15)' : 'rgba(51, 141, 252, 0.1)')
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: isDark ? '#e2e8f0' : '#334155',
              }}
              onMouseEnter={(e) => {
                if (!(selectedIcon === iconName && selectedType === 'bootstrap')) {
                  e.currentTarget.style.background = isDark ? '#334155' : '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (!(selectedIcon === iconName && selectedType === 'bootstrap')) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <i className={`bi bi-${iconName}`} style={{ fontSize: '1.25rem' }}></i>
              <span style={{
                fontSize: '0.625rem',
                color: isDark ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '55px',
              }}>
                {iconName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Current selection */}
      {selectedIcon && (
        <div className="mt-3 p-2 rounded-3" style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          <small style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Seleccionado: </small>
          {selectedType === 'svg' ? (
            <span dangerouslySetInnerHTML={{ __html: selectedIcon }} style={{ color: isDark ? '#e2e8f0' : '#0f172a' }} />
          ) : (
            <span style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
              <i className={`bi bi-${selectedIcon}`} style={{ fontSize: '1rem' }}></i> {selectedIcon}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
