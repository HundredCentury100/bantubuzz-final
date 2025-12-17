import { forwardRef } from 'react';

/**
 * Button Component
 *
 * Reusable button component with brand-compliant variants.
 * Follows BantuBuzz brand guidelines for colors and typography.
 *
 * @param {Object} props
 * @param {('primary'|'secondary'|'success'|'danger'|'ghost'|'outline')} props.variant - Button style variant
 * @param {('sm'|'md'|'lg')} props.size - Button size
 * @param {boolean} props.fullWidth - Whether button should be full width
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.leftIcon - Icon to show before text
 * @param {React.ReactNode} props.rightIcon - Icon to show after text
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 *
 * @example
 * <Button variant="primary" size="md">Click Me</Button>
 * <Button variant="success" loading>Processing...</Button>
 * <Button variant="outline" leftIcon={<PlusIcon />}>Add New</Button>
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  children,
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {

  // Base styles (always applied)
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant styles (color schemes)
  const variantStyles = {
    primary: `
      bg-primary text-dark
      hover:bg-primary-dark hover:text-white
      active:bg-primary-dark/90
      focus:ring-primary
      disabled:hover:bg-primary
    `,
    secondary: `
      bg-dark text-white
      hover:bg-gray-800
      active:bg-gray-900
      focus:ring-dark
      disabled:hover:bg-dark
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700
      active:bg-green-800
      focus:ring-green-500
      disabled:hover:bg-green-600
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      active:bg-red-800
      focus:ring-red-500
      disabled:hover:bg-red-600
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
      active:bg-gray-200
      focus:ring-gray-300
      disabled:hover:bg-transparent
    `,
    outline: `
      bg-transparent border-2 border-primary text-primary-dark
      hover:bg-primary hover:text-dark
      active:bg-primary-dark active:text-white active:border-primary-dark
      focus:ring-primary
      disabled:hover:bg-transparent disabled:hover:text-primary-dark
    `,
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Loading spinner SVG
  const LoadingSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Combine all styles
  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyles}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      ref={ref}
      type={type}
      className={combinedStyles}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
