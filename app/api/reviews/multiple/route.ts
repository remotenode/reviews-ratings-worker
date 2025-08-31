import { NextRequest, NextResponse } from 'next/server';
import { Env } from '../../../../src/types';
import { ReviewsHandler } from '../../../../src/handlers/reviews-handler';

// Create environment configuration
const env: Env = {
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  MAX_REVIEWS_PER_APP: process.env.MAX_REVIEWS_PER_APP || '200',
  REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS || '10000',
  RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'
};

export async function POST(request: NextRequest) {
  const reviewsHandler = new ReviewsHandler(env);
  return reviewsHandler.handleMultipleAppsReviews(request);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}
