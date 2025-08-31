import { NextRequest, NextResponse } from 'next/server';
import { Env, ReviewsRequest, ReviewsResponse, ErrorResponse } from '../types';
import { AppStoreService } from '../services/app-store-service';
import { Validators } from '../utils/validators';
import { ErrorHandler } from '../utils/error-handler';
import { Logger } from '../utils/logger';

export class ReviewsHandler {
  private appStoreService: AppStoreService;

  constructor(private env: Env) {
    this.appStoreService = new AppStoreService(env);
  }

  /**
   * Handle single app reviews request
   */
  async handleSingleAppReviews(request: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(request.url);
      const appId = url.searchParams.get('app_id');
      const limit = url.searchParams.get('limit');
      const includeMetadata = url.searchParams.get('include_metadata') !== 'false';
      const country = url.searchParams.get('country') || 'us';

      const requestData: ReviewsRequest = {
        app_id: appId || '',
        limit: limit ? parseInt(limit) : undefined,
        include_metadata: includeMetadata,
        country
      };

      return await this.processSingleAppRequest(requestData);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, 'REVIEWS_HANDLER');
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }

  /**
   * Handle single app reviews request via POST
   */
  async handleSingleAppReviewsPost(request: NextRequest): Promise<NextResponse> {
    try {
      const requestData = await request.json() as ReviewsRequest;
      return await this.processSingleAppRequest(requestData);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, 'REVIEWS_HANDLER');
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }



  /**
   * Process single app request
   */
  private async processSingleAppRequest(requestData: ReviewsRequest): Promise<NextResponse> {
    // Validate request
    const validation = Validators.validateReviewsRequest(requestData);
    if (!validation.isValid) {
      const errorResponse: ErrorResponse = {
        error: 'Validation Error',
        message: validation.errors.join(', '),
        app_id: requestData.app_id,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Sanitize inputs
    const appId = Validators.sanitizeAppId(requestData.app_id);
    const limit = requestData.limit ? 
      Validators.sanitizeLimit(requestData.limit, parseInt(this.env.MAX_REVIEWS_PER_APP)) : 
      parseInt(this.env.MAX_REVIEWS_PER_APP);

    try {
      Logger.info('Processing single app reviews request', 'REVIEWS_HANDLER', { 
        app_id: appId, 
        limit, 
        include_metadata: requestData.include_metadata 
      });

      let response: ReviewsResponse;

      if (requestData.include_metadata) {
        // Get both metadata and reviews
        const { metadata, reviews } = await this.appStoreService.getAppWithReviews(appId, limit, requestData.country);
        response = {
          app_id: appId,
          app_metadata: metadata,
          reviews,
          total_reviews: reviews.length,
          generated_at: new Date().toISOString()
        };
      } else {
        // Get only reviews
        const reviews = await this.appStoreService.getReviews(appId, limit, requestData.country);
        response = {
          app_id: appId,
          reviews,
          total_reviews: reviews.length,
          generated_at: new Date().toISOString()
        };
      }

      Logger.info('Successfully processed single app reviews request', 'REVIEWS_HANDLER', { 
        app_id: appId, 
        reviews_count: response.reviews.length 
      });

      return NextResponse.json(response);
    } catch (error) {
      Logger.error('Failed to process single app reviews request', 'REVIEWS_HANDLER', { app_id: appId }, error as Error);
      const errorResponse = ErrorHandler.handleError(error, 'REVIEWS_HANDLER', appId);
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }


}
