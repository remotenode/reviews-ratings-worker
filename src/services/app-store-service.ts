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
   * Get recent reviews from App Store using iTunes RSS feed with multiple sorting options
   */
  async getReviews(appId: string, limit: number = 3, country: string = 'us'): Promise<AppStoreReview[]> {
    try {
      Logger.info('Fetching App Store reviews with multiple sorting options', 'APP_STORE', { app_id: appId, limit, country });
      
      // Define sorting options to get more comprehensive reviews
      const sortOptions = [
        'mostRecent',
        'mostHelpful', 
        'mostFavorable',
        'mostCritical'
      ];
      
      const allReviews: AppStoreReview[] = [];
      const reviewIds = new Set<string>(); // To track unique reviews
      
      for (const sortBy of sortOptions) {
        try {
          const rssUrl = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=${sortBy}/json`;
          const response = await fetch(rssUrl, {
            signal: AbortSignal.timeout(parseInt(this.env.REQUEST_TIMEOUT_MS))
          });
          
          if (!response.ok) {
            Logger.warn(`Failed to fetch ${sortBy} reviews`, 'APP_STORE', { 
              app_id: appId, 
              sortBy,
              status: response.status 
            });
            continue;
          }
          
          const data = await response.json() as any;
          
          if (!data.feed || !data.feed.entry || !Array.isArray(data.feed.entry)) {
            Logger.warn(`Invalid RSS feed format for ${sortBy}`, 'APP_STORE', { app_id: appId, sortBy });
            continue;
          }
          
          // Skip the first entry as it's usually app metadata
          const reviews = data.feed.entry.slice(1, 50); // Get all available reviews (max 49)
          
          for (const review of reviews) {
            // Create a unique ID based on content to avoid duplicates
            const reviewContent = review.content?.label || '';
            const reviewAuthor = review.author?.name?.label || '';
            const reviewDate = review.updated?.label || '';
            const uniqueId = `${reviewContent.substring(0, 50)}_${reviewAuthor}_${reviewDate}`;
            
            if (!reviewIds.has(uniqueId)) {
              reviewIds.add(uniqueId);
              
              allReviews.push({
                id: `appstore_${appId}_${sortBy}_${allReviews.length}`,
                rating: parseInt(review['im:rating']?.label || '0'),
                title: review.title?.label || '',
                content: reviewContent,
                author: reviewAuthor,
                date: reviewDate,
                helpful_votes: parseInt(review['im:voteSum']?.label || '0'),
                app_id: appId
              });
            }
          }
          
          Logger.info(`Successfully fetched ${sortBy} reviews`, 'APP_STORE', { 
            app_id: appId, 
            sortBy,
            reviews_count: reviews.length 
          });
          
        } catch (error) {
          Logger.error(`Failed to fetch ${sortBy} reviews`, 'APP_STORE', { app_id: appId, sortBy }, error as Error);
          continue;
        }
      }
      
      // Sort by date (most recent first) and limit to requested amount
      const sortedReviews = allReviews
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      Logger.info('Successfully fetched combined App Store reviews', 'APP_STORE', { 
        app_id: appId, 
        total_found: allReviews.length,
        reviews_count: sortedReviews.length,
        sort_options_used: sortOptions.length
      });
      
      return sortedReviews;
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
