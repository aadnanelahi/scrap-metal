export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const formatCurrency = (amount, currency = 'AED') => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'status-draft',
    pending: 'status-pending',
    approved: 'status-active',
    posted: 'status-posted',
    cancelled: 'status-cancelled',
    active: 'status-active',
    completed: 'status-posted',
    first_weight: 'status-pending',
    second_weight: 'status-pending',
  };
  return colors[status] || 'status-draft';
};

export const toISODateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};
