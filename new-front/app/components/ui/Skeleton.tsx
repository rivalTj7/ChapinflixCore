interface SkeletonProps {
  className?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-shimmer bg-gray-800 rounded ${className}`}
          style={{
            background: 'linear-gradient(90deg, #374151 25%, #4B5563 50%, #374151 75%)',
            backgroundSize: '200% 100%'
          }}
        />
      ))}
    </>
  );
};

export {Skeleton };