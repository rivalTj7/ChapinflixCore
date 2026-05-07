import { forwardRef, InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  label,
  error,
  icon,
  iconPosition = 'left',
  ...props
}, ref) => {
  const baseClasses = 'w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';
  const errorClasses = error ? 'border-red-500' : 'border-gray-700';
  const classes = `${baseClasses} ${errorClasses} ${className}`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`${classes} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''}`}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export { Input };