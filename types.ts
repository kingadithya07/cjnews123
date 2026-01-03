

export enum UserRole {
  READER = 'READER',
  WRITER = 'WRITER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN'
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED'
}

export interface TrustedDevice {
  id: string;
  userId: string; // Associated user
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
  isPrimary: boolean;
  status: 'approved' | 'pending';
  browser: string;
}

export interface Article {
  id: string;
  userId?: string; // Owner ID for isolation
  slug?: string; // URL friendly permalink
  title: string;
  englishTitle?: string; // SEO Optimized Title
  subline?: string;
  author: string;
  authorAvatar?: string; // New field for author profile picture
  content: string; // Markdown or plain text
  categories: string[]; // Changed from single category to array
  imageUrl: string;
  publishedAt: string;
  status: ArticleStatus;
  summary?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
  isEditorsChoice?: boolean;
}

export interface EPaperRegion {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
  linkedArticleId?: string; // If null, maybe just a zoomed image
}

export interface EPaperPage {
  id: string;
  date: string;
  pageNumber: number;
  imageUrl: string;
  regions: EPaperRegion[];
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface ClassifiedAd {
  id: string;
  title: string;
  category: string; // e.g., Jobs, Real Estate, For Sale, Services
  content: string;
  price?: string;
  location?: string;
  contactInfo: string;
  postedAt: string;
}

export type AdSize = 
  | 'BILLBOARD'           // 970x250 (Desktop)
  | 'LEADERBOARD'         // 728x90 (Desktop)
  | 'LARGE_LEADERBOARD'   // 970x90 (Desktop)
  | 'RECTANGLE'           // 300x250 (Universal)
  | 'LARGE_RECTANGLE'     // 336x280 (Desktop/Tablet)
  | 'HALF_PAGE'           // 300x600 (Desktop)
  | 'SKYSCRAPER'          // 160x600 (Desktop)
  | 'MOBILE_BANNER'       // 320x50 (Mobile)
  | 'LARGE_MOBILE_BANNER' // 320x100 (Mobile)
  | 'CUSTOM';             // User defined

export type AdPlacement = 'GLOBAL' | 'HOME' | 'ARTICLE' | 'EPAPER' | 'EDITORIAL' | 'CLASSIFIEDS' | 'CATEGORY';

export interface Advertisement {
  id: string;
  imageUrl: string;
  linkUrl?: string; // Optional for offline ads
  title: string; // For alt text and admin ref
  size: AdSize;
  customWidth?: number;
  customHeight?: number;
  placement: AdPlacement;
  targetCategory?: string; // If placement is CATEGORY
  isActive: boolean;
}

export interface WatermarkSettings {
  text: string;
  fontSize: number; // in pixels (relative to canvas base)
  showLogo: boolean;
  logoUrl: string;
  logoSize: number; // percentage width relative to footer height
  backgroundColor: string;
  textColor: string;
}