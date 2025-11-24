import React, { useEffect, useState } from 'react';

function easeOutExpo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

const ModernStat = ({ value, label, color = '#27ae60', icon, duration = 1100, animationDirection = 'left' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = easeOutExpo(progress);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(animate);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(animate);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, duration]);
  const animationClass = animationDirection === 'right' ? 'modern-stat-animate-right' : 'modern-stat-animate-left';
  return (
    <div style={{
      padding: '12px 14px 10px 14px',
      borderRadius: '12px',
      background: `linear-gradient(98deg,${color}11 0%,#fff 88%)`,
      boxShadow: `0 4px 22px ${color}12`,
      minWidth: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }} className={`modern-stat-animate ${animationClass}`}>
      {icon && <span style={{ fontSize:'1.4rem', marginBottom:2 }}>{icon}</span>}
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color, letterSpacing: '-1px', lineHeight: 1.1, textShadow: `0 2px 12px ${color}14` }}>
        {display.toLocaleString()}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#555', fontWeight: 500, opacity: 0.89, marginTop: 3 }}>{label}</div>
      <style>{`
        .modern-stat-animate-left {
          animation: slideInFromLeft 0.8s cubic-bezier(.19,.94,.62,1.17);
        }
        .modern-stat-animate-right {
          animation: slideInFromRight 0.8s cubic-bezier(.19,.94,.62,1.17);
        }
        @keyframes slideInFromLeft {
          0% { opacity: 0; transform: translateX(-100px); filter: blur(10px); }
          100% { opacity: 1; transform: translateX(0); filter: blur(0px); }
        }
        @keyframes slideInFromRight {
          0% { opacity: 0; transform: translateX(100px); filter: blur(10px); }
          100% { opacity: 1; transform: translateX(0); filter: blur(0px); }
        }
      `}</style>
    </div>
  );
};
export default ModernStat;
