import React from 'react';

const svgBlobs = (
  <svg width="100%" height="160" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }} viewBox="0 0 900 160" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#6388ff" />
        <stop offset="100%" stopColor="#cd63ff" />
      </linearGradient>
      <radialGradient id="g2">
        <stop offset="0%" stopColor="#ffca85" stopOpacity="0.7"/>
        <stop offset="100%" stopColor="#ffca8501"/>
      </radialGradient>
    </defs>
    <ellipse cx="160" cy="100" rx="140" ry="32" fill="url(#g1)" opacity="0.22" />
    <ellipse cx="670" cy="70" rx="160" ry="48" fill="url(#g2)" opacity="0.14" />
    <ellipse cx="460" cy="30" rx="120" ry="28" fill="#fff" opacity="0.07" />
  </svg>
);

const ModernHeader = ({ title, subtitle, icon }) => (
  <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', marginBottom: '36px', boxShadow: '0 8px 54px #7389fd17, 0 1.5px 8px #6340d32a' }}
    className="modern-header-animate">
    <div style={{
      padding: '43px 58px',
      background: 'linear-gradient(98deg,#8fd3fb 0%,#7367f0 50%,#c471f5 100%)',
      color: 'white',
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      minHeight: 108,
    }}>
      {icon && <span style={{ fontSize: '3.0rem', filter: 'brightness(1.2) drop-shadow(0 2px 2px #5561b93c)' }}>{icon}</span>}
      <div>
        <h1 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', fontSize: '2.5rem', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <div style={{ opacity: 0.98, fontWeight: 400, marginTop: 2, fontSize: '1.15rem', color: 'rgba(255,255,255,0.92)' }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 160, pointerEvents: 'none' }}>
      {svgBlobs}
    </div>
    <style>{`
      .modern-header-animate {
        animation: fadeUpBlurHeader 0.8s cubic-bezier(.23,1.02,.38,1.00);
      }
      @keyframes fadeUpBlurHeader {
        0% { opacity: 0; filter: blur(17px); transform: translateY(45px); }
        100% { opacity: 1; filter: blur(0px); transform: none; }
      }
    `}</style>
  </div>
);

export default ModernHeader;
