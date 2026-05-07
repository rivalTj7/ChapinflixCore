import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  className = '',
  hover = true,
  padding = 'md',
  children,
  ...props
}, ref) => {
  const baseClasses = 'bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl transition-all duration-200';
  const hoverClasses = hover ? 'hover:bg-gray-800/50 hover:border-gray-700 hover:-translate-y-1 hover:shadow-lg' : '';
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const classes = `${baseClasses} ${hoverClasses} ${paddingClasses[padding]} ${className}`;

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';
export { Card };