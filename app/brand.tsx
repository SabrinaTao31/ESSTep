export function BrandMark() {
  return <span className="brandmark" aria-hidden="true"><img className="logo-mark" src="/esstep-step-icon.png" width="42" height="42" alt="" /></span>;
}

export function BrandLockup({compact = false}: {compact?: boolean}) {
  return <img className="logo-lockup" src="/esstep-logo.png" width={compact ? 136 : 185} height={compact ? 34 : 44} alt="ESSTep" />;
}
