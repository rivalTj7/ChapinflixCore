import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'bg-green-900/90 border-green-600 text-green-100',
    error: 'bg-red-900/90 border-red-600 text-red-100',
    warning: 'bg-yellow-900/90 border-yellow-600 text-yellow-100',
    info: 'bg-blue-900/90 border-blue-600 text-blue-100'
  };

  const Icon = icons[type];

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div 
      className={`${colors[type]} border backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-sm transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{title}</h4>
          {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
        </div>
        <button
          onClick={handleRemove}
          className="text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export { Toast };