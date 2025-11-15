export const convertCurrency = (amount, fromCurrency, toCurrency, conversionRate = 1.6) => {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'USD' && toCurrency === 'NPR') {
    return amount * conversionRate;
  } else if (fromCurrency === 'NPR' && toCurrency === 'USD') {
    return amount / conversionRate;
  }
  
  return amount;
};

export const formatCurrency = (amount, currency = 'NPR') => {
  const formatter = new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

export const getCurrencySymbol = (currency = 'NPR') => {
  const symbols = {
    'NPR': 'रु',
    'USD': '$',
    'INR': '₹'
  };
  return symbols[currency] || 'रु';
};