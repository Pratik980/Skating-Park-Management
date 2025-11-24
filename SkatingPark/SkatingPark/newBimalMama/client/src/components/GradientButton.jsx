import React from 'react';

const GradientButton = ({ children, color = '#27ae60', style = {}, ...props }) => {
  // Convert color to green shades if it's a non-green color
  const isGreen = color === '#27ae60' || color === '#2ecc71' || color === '#1e8449' || color === '#14532d' || color === '#1eaa52';
  const greenColor = isGreen ? color : '#27ae60';
  const lightGreen = '#2ecc71';
  const darkGreen = '#1e8449';
  
  return (
  <button
    {...props}
    className={['gradient-btn', props.className].filter(Boolean).join(' ')}
    style={{
      background: greenColor === '#222' || greenColor === '#000' || greenColor === '#000000' 
        ? '#222' 
        : `linear-gradient(93deg,${greenColor} 4%,${lightGreen} 100%)`,
      color: '#fff',
      border: 'none',
      fontWeight: 700,
      fontSize: '1.09rem',
      borderRadius: '12px',
      boxShadow: greenColor === '#222' || greenColor === '#000' || greenColor === '#000000'
        ? '0 2px 21px rgba(0,0,0,0.15)'
        : `0 2px 21px ${greenColor}22`,
      padding: '11px 27px',
      transition: 'all 0.23s cubic-bezier(0.43,1.13,0.66,1.05)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      outline: 'none',
      ...style,
    }}
    onMouseDown={e => {
      const ripple = document.createElement('span');
      ripple.className = 'g-btn-ripple';
      ripple.style.left = (e.nativeEvent.offsetX - 100) + 'px';
      ripple.style.top = (e.nativeEvent.offsetY - 100) + 'px';
      e.currentTarget.appendChild(ripple);
      setTimeout(() => ripple.remove(), 550);
      props.onMouseDown && props.onMouseDown(e);
    }}
  >
    {children}
    <style>{`
      .gradient-btn:hover {
        transform: scale(1.047); box-shadow: 0 6px 32px ${greenColor === '#222' || greenColor === '#000' || greenColor === '#000000' ? 'rgba(0,0,0,0.25)' : greenColor + '41'};
        filter: brightness(1.09);
      }
      .gradient-btn:focus {
        outline: 2px solid ${greenColor};
      }
      .g-btn-ripple {
        pointer-events: none;
        position: absolute;
        width: 200px; height: 200px;
        border-radius: 50%;
        background: rgba(255,255,255,0.21);
        opacity: 0.45;
        transform: scale(0.23);
        animation: ripple-burst .52s cubic-bezier(0.12,0.88,0.36,1.07);
        z-index: 20;
      }
      @keyframes ripple-burst {
        0% { transform: scale(0.23); opacity:0.4; }
        70% { opacity:0.11; }
        100% { transform: scale(1); opacity:0; }
      }
    `}</style>
  </button>
  );
};

export default GradientButton;
