import { cloneElement, useId } from 'react';

export default function FormField({ label, hint, children, className = '', ...props }) {
  const controlId = useId();
  const hintId = useId();
  const child = cloneElement(children, {
    id: children.props.id || controlId,
    'aria-describedby': hint ? hintId : children.props['aria-describedby'],
  });

  return (
    <div className={`field${className ? ` ${className}` : ''}`} {...props}>
      <label htmlFor={child.props.id}>{label}</label>
      {child}
      {hint && <span className="field-help" id={hintId}>{hint}</span>}
    </div>
  );
}

export function FieldGroup({ label, children, className = '', ...props }) {
  return (
    <fieldset className={`field fieldset-reset${className ? ` ${className}` : ''}`} {...props}>
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}
