export interface Env {
  ENVIRONMENT: string;
  MAX_REVIEWS_PER_APP: string;
  REQUEST_TIMEOUT_MS: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE: string;
  ASO_MARKET_API_URL?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

export interface AppStoreApp {
  app_id: string;
  name: string;
  rating: number;
  rating_count: number;
  reviews_count: number;
  url: string;
  platform: 'app_store';
  last_updated: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  appletvScreenshotUrls?: string[];
}

export interface AppStoreReview {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  helpful_votes?: number;
  app_id: string;
}

export interface ReviewsRequest {
  app_id: string;
  limit?: number;
  include_metadata?: boolean;
  country?: string;
}

export interface ReviewsResponse {
  app_id: string;
  app_metadata?: AppStoreApp;
  reviews: AppStoreReview[];
  total_reviews: number;
  generated_at: string;
}

export interface MultipleAppsRequest {
  app_ids: string[];
  limit?: number;
  include_metadata?: boolean;
}

export interface MultipleAppsResponse {
  apps: ReviewsResponse[];
  total_apps: number;
  successful_apps: number;
  generated_at: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  app_id?: string;
  timestamp: string;
}
