// Safe avatar initial — last name's first letter, never crashes on empty/whitespace.
export const getInitial = (name) =>
  (name || '').trim().split(/\s+/).filter(Boolean).pop()?.[0]?.toUpperCase() || 'A';
