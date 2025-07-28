/**
 * Optimized Image Component
 * Provides advanced image optimization with lazy loading and responsive sizing
 */

'use client';

import Image from 'next/image';
import { useState, useCallback, memo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  loading?: 'eager' | 'lazy';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = memo<OptimizedImageProps>(
  ({
    src,
    alt,
    width,
    height,
    className = '',
    fill = false,
    priority = false,
    placeholder = 'empty',
    blurDataURL,
    sizes,
    quality = 75,
    loading = 'lazy',
    objectFit = 'cover',
    onLoad,
    onError,
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback(() => {
      setIsLoading(false);
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    }, [onError]);

    // Generate responsive sizes if not provided
    const responsiveSizes =
      sizes || (fill ? '100vw' : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw');

    // Generate blur placeholder if not provided
    const defaultBlurDataURL =
      blurDataURL ||
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

    if (hasError) {
      return (
        <div
          className={`bg-muted flex items-center justify-center text-muted-foreground ${className}`}
          style={{ width, height }}
        >
          <span className="text-sm">Failed to load image</span>
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" style={{ width, height }} />
        )}

        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
          sizes={responsiveSizes}
          quality={quality}
          loading={loading}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            objectFit: fill ? objectFit : undefined,
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
