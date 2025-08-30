import { ErrorResponse } from '../types';
import { Logger } from './logger';

export class ErrorHandler {
  static createError(message: string, originalError?: any): Error {
    const error = new Error(message);
    if (originalError) {
      error.cause = originalError;
    }
    return error;
  }

  static createErrorResponse(
    error: string, 
    message?: string, 
    app_id?: string
  ): ErrorResponse {
    return {
      error,
      message,
      app_id,
      timestamp: new Date().toISOString()
    };
  }

  static handleError(error: any, context: string, app_id?: string): ErrorResponse {
    Logger.error('Error occurred', context, { app_id }, error as Error);
    
    if (error instanceof Error) {
      return this.createErrorResponse(
        'Internal Server Error',
        error.message,
        app_id
      );
    }
    
    return this.createErrorResponse(
      'Unknown Error',
      'An unexpected error occurred',
      app_id
    );
  }

  static isNetworkError(error: any): boolean {
    return error?.message?.includes('fetch') || 
           error?.message?.includes('network') ||
           error?.message?.includes('timeout');
  }

  static isRateLimitError(error: any): boolean {
    return error?.message?.includes('rate limit') ||
           error?.message?.includes('429') ||
           error?.message?.includes('too many requests');
  }
}
