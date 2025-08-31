import { AppStoreApp, AppStoreReview, Env } from '../types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

export class AppStoreService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get app metadata from iTunes API
   */
  async getAppMetadata(appId: string): Promise<AppStoreApp> {
    try {
      Logger.info('Fetching app metadata', 'APP_STORE', { app_id: appId });
      
      const url = `https://itunes.apple.com/lookup?id=${appId}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(parseInt(this.env.REQUEST_TIMEOUT_MS))
      });

      if (!response.ok) {
        throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;

      if (!data.results || data.results.length === 0) {
        throw new Error('App not found in App Store');
      }

      const app = data.results[0];
      
      const appMetadata: AppStoreApp = {
        app_id: appId,
        name: app.trackName || 'Unknown App',
        rating: app.averageUserRating || 0,
        rating_count: app.userRatingCount || 0,
        reviews_count: app.userRatingCount || 0, // iTunes API doesn't separate ratings and reviews count
        url: `https://apps.apple.com/app/id${appId}`,
        platform: 'app_store',
        last_updated: new Date().toISOString(),
        screenshotUrls: app.screenshotUrls || [],
        ipadScreenshotUrls: app.ipadScreenshotUrls || []
      };

      Logger.info('Successfully fetched app metadata', 'APP_STORE', { 
        app_id: appId, 
        name: appMetadata.name,
        rating: appMetadata.rating,
        rating_count: appMetadata.rating_count
      });

      return appMetadata;
    } catch (error) {
      Logger.error('Failed to fetch app metadata', 'APP_STORE', { app_id: appId }, error as Error);
      throw ErrorHandler.createError('Failed to fetch app metadata', error);
    }
  }

  /**
   * Get recent reviews from App Store using iTunes RSS feed
   */
  async getReviews(appId: string, limit: number = 3, country: string = 'us'): Promise<AppStoreReview[]> {
    try {
      Logger.info('Fetching App Store reviews', 'APP_STORE', { app_id: appId, limit, country });
      
      // Use iTunes RSS feed for reviews with country support
      const rssUrl = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
      const response = await fetch(rssUrl, {
        signal: AbortSignal.timeout(parseInt(this.env.REQUEST_TIMEOUT_MS))
      });
      
      if (!response.ok) {
        Logger.warn('Failed to fetch App Store RSS feed', 'APP_STORE', { 
          app_id: appId, 
          status: response.status 
        });
        return [];
      }
      
      const data = await response.json() as any;
      
      if (!data.feed || !data.feed.entry || !Array.isArray(data.feed.entry)) {
        Logger.warn('Invalid RSS feed format', 'APP_STORE', { app_id: appId });
        return [];
      }
      
      // Skip the first entry as it's usually app metadata
      const reviews = data.feed.entry.slice(1, limit + 1);
      
      const formattedReviews: AppStoreReview[] = reviews.map((review: any, index: number) => ({
        id: `appstore_${appId}_${index}`,
        rating: parseInt(review['im:rating']?.label || '0'),
        title: review.title?.label || '',
        content: review.content?.label || '',
        author: review.author?.name?.label || 'Anonymous',
        date: review.updated?.label || new Date().toISOString(),
        helpful_votes: parseInt(review['im:voteSum']?.label || '0'),
        app_id: appId
      }));
      
      Logger.info('Successfully fetched App Store reviews', 'APP_STORE', { 
        app_id: appId, 
        reviews_count: formattedReviews.length 
      });
      
      return formattedReviews;
    } catch (error) {
      Logger.error('Failed to get App Store reviews', 'APP_STORE', { app_id: appId }, error as Error);
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
      Logger.info('Fetching app with reviews', 'APP_STORE', { app_id: appId, limit, country });
      
      // Fetch metadata and reviews in parallel
      const [metadata, reviews] = await Promise.all([
        this.getAppMetadata(appId),
        this.getReviews(appId, limit, country)
      ]);

      Logger.info('Successfully fetched app with reviews', 'APP_STORE', { 
        app_id: appId,
        reviews_count: reviews.length
      });

      return { metadata, reviews };
    } catch (error) {
      Logger.error('Failed to get app with reviews', 'APP_STORE', { app_id: appId }, error as Error);
      throw ErrorHandler.createError('Failed to get app with reviews', error);
    }
  }

}
