import React from 'react';

const Loader = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClass = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div className="loading-state">
      <div 
        className="spinner" 
        style={{ 
          width: sizeClass[size], 
          height: sizeClass[size] 
        }}
      ></div>
      {text && <p>{text}</p>}
    </div>
  );
};

export default Loader;