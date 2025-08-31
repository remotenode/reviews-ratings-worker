import { AppStoreApp, AppStoreReview, Env } from '../types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

export class ASOMarketService {
  private env: Env;
  private baseUrl: string;

  constructor(env: Env) {
    this.env = env;
    this.baseUrl = 'https://ios.reviews.aso.market';
  }

  /**
   * Get app metadata from ASO Market API
   */
  async getAppMetadata(appId: string): Promise<AppStoreApp> {
    try {
      Logger.info('Fetching app metadata from ASO Market', 'ASO_MARKET', { app_id: appId });
      
      const url = `${this.baseUrl}/api/apps/${appId}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(parseInt(this.env.REQUEST_TIMEOUT_MS)),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'reviews-ratings-api/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ASO Market API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      const appMetadata: AppStoreApp = {
        app_id: appId,
        name: data.name || 'Unknown App',
        rating: data.rating || 0,
        rating_count: data.rating_count || 0,
        reviews_count: data.reviews_count || 0,
        url: `https://apps.apple.com/app/id${appId}`,
        platform: 'app_store',
        last_updated: new Date().toISOString(),
        screenshotUrls: data.screenshotUrls || [],
        ipadScreenshotUrls: data.ipadScreenshotUrls || []
      };

      Logger.info('Successfully fetched app metadata from ASO Market', 'ASO_MARKET', { 
        app_id: appId, 
        name: appMetadata.name,
        rating: appMetadata.rating,
        rating_count: appMetadata.rating_count
      });

      return appMetadata;
    } catch (error) {
      Logger.error('Failed to fetch app metadata from ASO Market', 'ASO_MARKET', { app_id: appId }, error as Error);
      throw ErrorHandler.createError('Failed to fetch app metadata from ASO Market', error);
    }
  }

  /**
   * Get recent reviews from ASO Market API
   */
  async getReviews(appId: string, limit: number = 3, country: string = 'us'): Promise<AppStoreReview[]> {
    try {
      Logger.info('Fetching reviews from ASO Market', 'ASO_MARKET', { app_id: appId, limit, country });
      
      const url = `${this.baseUrl}/api/apps/${appId}/reviews?limit=${limit}&country=${country}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(parseInt(this.env.REQUEST_TIMEOUT_MS)),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'reviews-ratings-api/1.0.0'
        }
      });
      
      if (!response.ok) {
        Logger.warn('Failed to fetch reviews from ASO Market', 'ASO_MARKET', { 
          app_id: appId, 
          status: response.status 
        });
        return [];
      }
      
      const data = await response.json() as any;
      
      if (!data.reviews || !Array.isArray(data.reviews)) {
        Logger.warn('Invalid response format from ASO Market', 'ASO_MARKET', { app_id: appId });
        return [];
      }
      
      const formattedReviews: AppStoreReview[] = data.reviews.map((review: any, index: number) => ({
        id: `asomarket_${appId}_${index}`,
        rating: review.rating || 0,
        title: review.title || '',
        content: review.content || '',
        author: review.author || 'Anonymous',
        date: review.date || new Date().toISOString(),
        helpful_votes: review.helpful_votes || 0,
        app_id: appId
      }));
      
      Logger.info('Successfully fetched reviews from ASO Market', 'ASO_MARKET', { 
        app_id: appId, 
        reviews_count: formattedReviews.length 
      });
      
      return formattedReviews;
    } catch (error) {
      Logger.error('Failed to get reviews from ASO Market', 'ASO_MARKET', { app_id: appId }, error as Error);
      return [];
    }
  }

  /**
   * Get app metadata and reviews in one call
   */
  async getAppWithReviews(appId: string, limit: number = 3, country: string = 'us'): Promise<{
    metadata: AppStoreApp;
    reviews: AppStoreReview[];
  }> {
    try {
      Logger.info('Fetching app with reviews from ASO Market', 'ASO_MARKET', { app_id: appId, limit, country });
      
      // Fetch metadata and reviews in parallel
      const [metadata, reviews] = await Promise.all([
        this.getAppMetadata(appId),
        this.getReviews(appId, limit, country)
      ]);

      Logger.info('Successfully fetched app with reviews from ASO Market', 'ASO_MARKET', { 
        app_id: appId,
        reviews_count: reviews.length
      });

      return { metadata, reviews };
    } catch (error) {
      Logger.error('Failed to get app with reviews from ASO Market', 'ASO_MARKET', { app_id: appId }, error as Error);
      throw ErrorHandler.createError('Failed to get app with reviews from ASO Market', error);
    }
  }
}
