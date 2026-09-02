/**
 * NewFaithCTA — the only filled green button.
 * Used only for: Begin Day 1, Start New to Faith, Continue Journey,
 * and Mark as read / Day progress on that journey.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface NewFaithCTAProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export function NewFaithCTA({
  children,
  loading = false,
  disabled,
  icon,
  className,
  type = 'button',
  ...rest
}: NewFaithCTAProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={`dw-new-faith-cta${className ? ` ${className}` : ''}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon ? <span className="dw-new-faith-cta-icon" aria-hidden>{icon}</span> : null}
      <span className="dw-new-faith-cta-label">{children}</span>
    </button>
  );
}
