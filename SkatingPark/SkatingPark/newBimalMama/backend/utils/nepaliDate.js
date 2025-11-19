// Nepali date utilities
import { adToBs } from '@sbmdkl/nepali-date-converter';

// Always returns real current date and time
export const getCurrentNepaliDate = () => {
  const currentDate = new Date();
  // Format English date as YYYY-MM-DD string
  const englishDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  // Convert English date (AD) to Nepali date (BS) using the converter library
  const nepaliDateStr = adToBs(englishDateStr);
  // adToBs returns string in format "YYYY-MM-DD"
  return nepaliDateStr;
};

// Convert any English date to Nepali date
export const convertToNepaliDate = (englishDate) => {
  if (!englishDate) return getCurrentNepaliDate();
  
  let date;
  if (englishDate instanceof Date) {
    date = englishDate;
  } else if (typeof englishDate === 'string') {
    date = new Date(englishDate);
  } else {
    date = new Date(englishDate);
  }
  
  // Format English date as YYYY-MM-DD string
  const englishDateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  // Convert English date (AD) to Nepali date (BS)
  const nepaliDateStr = adToBs(englishDateStr);
  return nepaliDateStr;
};

// Always returns real current time with seconds
export const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const formatNepaliDate = (date) => {
  if (!date) return getCurrentNepaliDate();
  return date;
};

export const getNepaliMonthName = (month) => {
  const months = [
    'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
    'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
  ];
  return months[month - 1] || '';
};