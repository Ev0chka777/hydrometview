const icons = {
  sunny: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="32" cy="32" r="14" fill="#FCD34D" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1={32 + Math.cos((deg * Math.PI) / 180) * 20}
          y1={32 + Math.sin((deg * Math.PI) / 180) * 20}
          x2={32 + Math.cos((deg * Math.PI) / 180) * 27}
          y2={32 + Math.sin((deg * Math.PI) / 180) * 27}
          stroke="#FCD34D"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  ),
  partly_cloudy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="26" cy="26" r="12" fill="#FCD34D" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1={26 + Math.cos((deg * Math.PI) / 180) * 17}
          y1={26 + Math.sin((deg * Math.PI) / 180) * 17}
          x2={26 + Math.cos((deg * Math.PI) / 180) * 22}
          y2={26 + Math.sin((deg * Math.PI) / 180) * 22}
          stroke="#FCD34D"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <path d="M18 42 Q18 34 26 34 Q28 28 36 29 Q44 29 44 37 Q50 37 50 43 Q50 49 44 49 H22 Q16 49 16 43 Q16 42 18 42Z" fill="#94A3B8" />
    </svg>
  ),
  cloudy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M12 40 Q12 30 22 30 Q24 22 34 22 Q46 22 46 32 Q54 32 54 40 Q54 48 46 48 H20 Q12 48 12 40Z" fill="#94A3B8" />
    </svg>
  ),
  rainy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M10 34 Q10 24 20 24 Q22 16 32 16 Q44 16 44 26 Q52 26 52 34 Q52 42 44 42 H18 Q10 42 10 34Z" fill="#64748B" />
      <line x1="22" y1="47" x2="19" y2="55" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="47" x2="29" y2="55" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="47" x2="39" y2="55" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  stormy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M10 32 Q10 22 20 22 Q22 14 32 14 Q44 14 44 24 Q52 24 52 32 Q52 40 44 40 H18 Q10 40 10 32Z" fill="#475569" />
      <polyline points="34,40 28,50 34,50 28,60" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  snowy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M10 34 Q10 24 20 24 Q22 16 32 16 Q44 16 44 26 Q52 26 52 34 Q52 42 44 42 H18 Q10 42 10 34Z" fill="#94A3B8" />
      <circle cx="22" cy="50" r="3" fill="white" />
      <circle cx="32" cy="53" r="3" fill="white" />
      <circle cx="42" cy="50" r="3" fill="white" />
    </svg>
  ),
  foggy: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      {[22, 30, 38, 46].map((y, i) => (
        <line
          key={y}
          x1={i % 2 === 0 ? 12 : 16}
          y1={y}
          x2={i % 2 === 0 ? 52 : 48}
          y2={y}
          stroke="#94A3B8"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  ),
}

export default function WeatherIcon({ type = 'sunny', className = 'w-12 h-12' }) {
  return (
    <div className={className}>
      {icons[type] || icons.sunny}
    </div>
  )
}
