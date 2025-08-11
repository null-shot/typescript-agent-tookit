"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import Image from 'next/image';

export interface ImageAssets {
  defaultAvatar: string;
  badgeLightBg: string;
  gears: string;
  dockerLogo?: string;
  cursorLogo?: string;
  ellipse?: string;
}

export interface ImageProviderProps {
  children: ReactNode;
  assets: ImageAssets;
  // Optional custom image component for framework-specific optimizations
  ImageComponent?: React.ComponentType<ImageComponentProps>;
}

interface ImageComponentProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any; // Allow additional props
}

const ImageContext = createContext<{
  assets: ImageAssets;
  ImageComponent: React.ComponentType<ImageComponentProps>;
} | null>(null);

// Default image component using Next.js Image
const DefaultImageComponent: React.FC<ImageComponentProps> = ({ src, alt, width, height, className, style, ...props }) => {
  return (
    <Image 
      src={src} 
      alt={alt} 
      width={width || 24} 
      height={height || 24} 
      className={className}
      style={style}
      {...props}
    />
  );
};

export function ImageProvider({ children, assets, ImageComponent = DefaultImageComponent }: ImageProviderProps) {
  return (
    <ImageContext.Provider value={{ assets, ImageComponent }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImages() {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImages must be used within an ImageProvider');
  }
  return context;
}

// Helper component for rendering images
export function PlaygroundImage({ 
  assetKey, 
  src, 
  alt, 
  ...props 
}: { 
  assetKey?: keyof ImageAssets;
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { assets, ImageComponent } = useImages();
  
  const imageSrc = assetKey ? assets[assetKey] : src;
  
  if (!imageSrc) {
    console.warn(`PlaygroundImage: No source provided for ${alt}`);
    return null;
  }
  
  return <ImageComponent src={imageSrc} alt={alt} {...props} />;
} 