export const convertCurrency = (amount, fromCurrency, toCurrency, conversionRate = 1.6) => {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'USD' && toCurrency === 'NPR') {
    return amount * conversionRate;
  } else if (fromCurrency === 'NPR' && toCurrency === 'USD') {
    return amount / conversionRate;
  }
  
  return amount;
};

export const formatCurrency = (amount, currency = 'NPR', conversionRate = 1.6) => {
  const convertedAmount = currency === 'NPR' ? amount : convertCurrency(amount, 'NPR', currency, conversionRate);
  
  if (currency === 'NPR') {
    return `रु ${convertedAmount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'USD') {
    return `$ ${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'INR') {
    return `₹ ${convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  return convertedAmount.toLocaleString();
};

export const getCurrencySymbol = (currency = 'NPR') => {
  const symbols = {
    'NPR': 'रु',
    'USD': '$',
    'INR': '₹'
  };
  return symbols[currency] || 'रु';
};

export const parseCurrency = (value) => {
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    return parseFloat(value.replace(/[^\d.-]/g, ''));
  }
  return value;
};