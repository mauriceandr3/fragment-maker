import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { base: string; disabled: string }> = {
  primary: {
    base: 'bg-white/10 hover:bg-white border-white/20 text-white hover:text-black shadow-lg hover:shadow-xl',
    disabled: 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed',
  },
  secondary: {
    base: 'bg-black/30 hover:bg-white/10 border-white/20 text-white/70 hover:text-white shadow-lg hover:shadow-xl',
    disabled: 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed',
  },
  ghost: {
    base: 'bg-black/30 hover:bg-white/10 border-white/20 text-white/60 hover:text-white',
    disabled: 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed',
  },
  icon: {
    base: 'bg-black/40 hover:bg-white border-white/30 text-white hover:text-black shadow-lg hover:shadow-xl',
    disabled: 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed',
  },
};

const sizeStyles: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { md: 'py-3 px-4', sm: 'py-2.5 px-3' },
  secondary: { md: 'py-3 px-4', sm: 'py-2.5 px-3' },
  ghost: { md: 'py-2.5 px-4', sm: 'py-2.5 px-3' },
  icon: { md: 'p-1.5', sm: 'p-1' },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const isIcon = variant === 'icon';

  const classes = [
    'backdrop-blur-md border flex items-center justify-center gap-2 transition-all',
    isIcon ? 'rounded-lg' : 'rounded-xl',
    sizeStyles[variant][size],
    disabled ? v.disabled : v.base,
    fullWidth && 'w-full',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button disabled={disabled} className={classes} {...props}>
      {icon}
      {children && <span className={isIcon ? '' : size === 'sm' ? 'text-xs' : 'text-sm'}>{children}</span>}
    </button>
  );
}
