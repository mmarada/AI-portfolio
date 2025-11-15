
import React from 'react';

interface SkeletonLoaderProps {
    className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className }) => {
    return (
        <div className={`bg-neutral-800/50 animate-pulse rounded-lg ${className}`}></div>
    );
};

export default SkeletonLoader;