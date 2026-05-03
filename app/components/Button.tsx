import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-[var(--primary)] text-white shadow-lg shadow-pink-200 hover:bg-[var(--primary-dark)] hover:shadow-xl'
      : 'border border-pink-200 bg-white text-[var(--primary)] hover:bg-pink-50';

  return (
    <button
      className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
