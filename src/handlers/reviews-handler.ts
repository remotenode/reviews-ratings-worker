import { NextRequest, NextResponse } from 'next/server';
import { Env, ReviewsRequest, ReviewsResponse, MultipleAppsRequest, MultipleAppsResponse, ErrorResponse } from '../types';
import { ASOMarketService } from '../services/aso-market-service';
import { Validators } from '../utils/validators';
import { ErrorHandler } from '../utils/error-handler';
import { Logger } from '../utils/logger';

export class ReviewsHandler {
  private asoMarketService: ASOMarketService;

  constructor(private env: Env) {
    this.asoMarketService = new ASOMarketService(env);
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

      const requestData: ReviewsRequest = {
        app_id: appId || '',
        limit: limit ? parseInt(limit) : undefined,
        include_metadata: includeMetadata
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
   * Handle multiple apps reviews request
   */
  async handleMultipleAppsReviews(request: NextRequest): Promise<NextResponse> {
    try {
      const requestData = await request.json() as MultipleAppsRequest;
      return await this.processMultipleAppsRequest(requestData);
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
        const { metadata, reviews } = await this.asoMarketService.getAppWithReviews(appId, limit);
        response = {
          app_id: appId,
          app_metadata: metadata,
          reviews,
          total_reviews: reviews.length,
          generated_at: new Date().toISOString()
        };
      } else {
        // Get only reviews
        const reviews = await this.asoMarketService.getReviews(appId, limit);
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

  /**
   * Process multiple apps request
   */
  private async processMultipleAppsRequest(requestData: MultipleAppsRequest): Promise<NextResponse> {
    // Validate request
    const validation = Validators.validateMultipleAppsRequest(requestData);
    if (!validation.isValid) {
      const errorResponse: ErrorResponse = {
        error: 'Validation Error',
        message: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Sanitize inputs
    const appIds = requestData.app_ids.map(Validators.sanitizeAppId);
    const limit = requestData.limit ? 
      Validators.sanitizeLimit(requestData.limit, parseInt(this.env.MAX_REVIEWS_PER_APP)) : 
      parseInt(this.env.MAX_REVIEWS_PER_APP);

    try {
      Logger.info('Processing multiple apps reviews request', 'REVIEWS_HANDLER', { 
        app_count: appIds.length, 
        limit, 
        include_metadata: requestData.include_metadata 
      });

      const results = await this.asoMarketService.getMultipleAppsReviews(appIds, limit);

      const apps: ReviewsResponse[] = appIds.map(appId => {
        const result = results[appId];
        return {
          app_id: appId,
          app_metadata: requestData.include_metadata ? result.metadata : undefined,
          reviews: result.reviews,
          total_reviews: result.reviews.length,
          generated_at: new Date().toISOString()
        };
      });

      const successfulApps = apps.filter(app => app.reviews.length > 0).length;

      const response: MultipleAppsResponse = {
        apps,
        total_apps: apps.length,
        successful_apps: successfulApps,
        generated_at: new Date().toISOString()
      };

      Logger.info('Successfully processed multiple apps reviews request', 'REVIEWS_HANDLER', { 
        app_count: apps.length, 
        successful: successfulApps 
      });

      return NextResponse.json(response);
    } catch (error) {
      Logger.error('Failed to process multiple apps reviews request', 'REVIEWS_HANDLER', { app_count: appIds.length }, error as Error);
      const errorResponse = ErrorHandler.handleError(error, 'REVIEWS_HANDLER');
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
}
