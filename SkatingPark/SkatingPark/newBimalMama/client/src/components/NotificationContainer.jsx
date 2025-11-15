import React from 'react';
import { useApp } from '../context/AppContext';

const NotificationContainer = () => {
  const { error, clearError } = useApp();

  if (!error) return null;

  return (
    <div className="alert alert-error">
      <div className="d-flex justify-between align-center">
        <span>{error}</span>
        <button onClick={clearError} className="close-button">
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationContainer;