import React from 'react';

const SectionCard = ({
  title,
  icon,
  accentColor = '#7367f0',
  headerActions = null,
  children,
  style = {},
  ...rest
}) => (
  <section
    className="section-card-animate"
    style={{
      borderRadius: '24px',
      background: 'rgba(255,255,255,0.65)',
      boxShadow: '0 8px 46px #7367f027, 0 1.5px 8px #6340d32a',
      border: `1.7px solid ${accentColor}14`,
      backdropFilter: 'saturate(1.5) blur(10px)',
      marginBottom: 38,
      padding: '38px 38px 30px 38px',
      position: 'relative',
      ...style,
    }}
    {...rest}
  >
    {(title || headerActions) && (
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {icon && <span style={{ fontSize: '2rem' }}>{icon}</span>}
            <span
              style={{
                fontWeight: 700,
                fontSize: '1.35rem',
                color: accentColor,
                letterSpacing: '-0.5px',
                lineHeight: 1.14,
                background: `linear-gradient(98deg,${accentColor},#8fd3fb,#c471f5)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}
            >
              {title}
            </span>
          </div>
        )}
        {headerActions && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {headerActions}
          </div>
        )}
      </div>
    )}
    <div>
      {children}
    </div>
    <style>{`
      .section-card-animate {
        animation: fadeUpCard 0.7s cubic-bezier(.19,.94,.62,1.17);
        transition: box-shadow 0.22s, border-color 0.22s, background 0.22s;
      }
      .section-card-animate:hover {
        box-shadow: 0 16px 64px #7367f087, 0 2px 16px #6340d32a;
        border-color: ${accentColor}55;
        background: rgba(255,255,255,0.82);
      }
      @keyframes fadeUpCard {
        0% { opacity: 0; filter: blur(13px); transform: translateY(38px); }
        100% { opacity: 1; filter: blur(0px); transform: none; }
      }
    `}</style>
  </section>
);

export default SectionCard;
