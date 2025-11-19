import React, { useEffect, useState } from 'react';

function easeOutExpo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

const ModernStat = ({ value, label, color = '#7367f0', icon, duration = 1100 }) => {
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
  return (
    <div style={{
      padding: '25px 24px 18px 24px',
      borderRadius: '17px',
      background: `linear-gradient(98deg,${color}11 0%,#fff 88%)`,
      boxShadow: `0 4px 22px ${color}12`,
      minWidth: 132,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }} className="modern-stat-animate">
      {icon && <span style={{ fontSize:'2.1rem', marginBottom:4 }}>{icon}</span>}
      <div style={{ fontSize: '2.22rem', fontWeight: 900, color, letterSpacing: '-1px', lineHeight: 1.1, textShadow: `0 2px 12px ${color}14` }}>
        {display.toLocaleString()}
      </div>
      <div style={{ fontSize: '0.96rem', color: '#555', fontWeight: 500, opacity: 0.89, marginTop: 5 }}>{label}</div>
      <style>{`
        .modern-stat-animate {
          animation: fadeStatUp 0.6s  cubic-bezier(.19,.94,.62,1.17);
        }
        @keyframes fadeStatUp {
          0% { opacity: 0; filter: blur(18px); transform: scale(0.7); }
          100% { opacity: 1; filter: blur(0px); transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
export default ModernStat;
