import React from 'react';

/**
 * Renderiza un icono guardado en cualquiera de los dos formatos del selector:
 *  - iconType 'bootstrap': `icon` es el nombre de un Bootstrap Icon (sin prefijo bi-).
 *  - iconType 'svg': `icon` es el markup SVG completo.
 *
 * Fuente única de verdad para pintar iconos en toda la app (categorías,
 * servicios recurrentes, etc.).
 */
const Icon = ({ icon, iconType = 'bootstrap', fallback = 'tag', size, className = '', style = {} }) => {
  const mergedStyle = size ? { fontSize: size, lineHeight: 1, ...style } : style;

  if (icon && iconType === 'svg') {
    return (
      <span
        className={className}
        style={mergedStyle}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }

  const name = icon || fallback;
  return <i className={`bi bi-${name} ${className}`.trim()} style={mergedStyle} />;
};

export default Icon;
