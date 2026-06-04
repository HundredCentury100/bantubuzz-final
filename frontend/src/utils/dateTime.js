export const parseApiDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const normalized = hasTimezone ? text : `${text}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatRelativeTime = (value) => {
  const date = parseApiDate(value);
  if (!date) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
};
