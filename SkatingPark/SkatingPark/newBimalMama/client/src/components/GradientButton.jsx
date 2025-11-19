import React from 'react';

const GradientButton = ({ children, color = '#7a63fa', style = {}, ...props }) => (
  <button
    {...props}
    className={['gradient-btn', props.className].filter(Boolean).join(' ')}
    style={{
      background: `linear-gradient(93deg,${color} 4%,#8fd3fb 100%)`,
      color: '#fff',
      border: 'none',
      fontWeight: 700,
      fontSize: '1.09rem',
      borderRadius: '12px',
      boxShadow: `0 2px 21px ${color}22`,
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
        transform: scale(1.047); box-shadow: 0 6px 32px ${color}41;
        filter: brightness(1.09);
      }
      .gradient-btn:focus {
        outline: 2px solid ${color};
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

export default GradientButton;
