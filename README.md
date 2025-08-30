# Reviews & Ratings API

A Vercel-based API for fetching App Store reviews and ratings using the iTunes API.

## Features

- 🍎 Fetch App Store app metadata and reviews
- 📊 Get ratings, review counts, and detailed review information
- 🔄 Support for multiple apps in a single request
- 🛡️ Input validation and sanitization
- 📝 Comprehensive logging and error handling
- 🌐 CORS enabled for cross-origin requests

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the health status of the API.

### Single App Reviews
```
GET /api/reviews?app_id={app_id}&limit={limit}&include_metadata={boolean}
POST /api/reviews
```

**Query Parameters:**
- `app_id` (required): App Store app ID (numeric string)
- `limit` (optional): Number of reviews to fetch (1-50, default: 10)
- `include_metadata` (optional): Include app metadata (true/false, default: true)

**POST Body:**
```json
{
  "app_id": "284882215",
  "limit": 5,
  "include_metadata": true
}
```

### Multiple Apps Reviews
```
POST /api/reviews/multiple
```

**Request Body:**
```json
{
  "app_ids": ["284882215", "547702041"],
  "limit": 3,
  "include_metadata": false
}
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
ENVIRONMENT=development
MAX_REVIEWS_PER_APP=10
REQUEST_TIMEOUT_MS=10000
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Type checking:
```bash
npm run type-check
```

## Deployment

This project is configured for Vercel deployment. Simply connect your repository to Vercel and deploy.

## Example Usage

### Get Facebook app reviews
```bash
curl "http://localhost:3000/api/reviews?app_id=284882215&limit=3"
```

### Get multiple apps reviews
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"app_ids":["284882215","547702041"],"limit":2}' \
  http://localhost:3000/api/reviews/multiple
```

## Response Format

### Single App Response
```json
{
  "app_id": "284882215",
  "app_metadata": {
    "app_id": "284882215",
    "name": "Facebook",
    "rating": 4.5,
    "rating_count": 22093364,
    "reviews_count": 22093364,
    "url": "https://apps.apple.com/app/id284882215",
    "platform": "app_store",
    "last_updated": "2025-08-30T19:25:13.059Z"
  },
  "reviews": [
    {
      "id": "appstore_284882215_0",
      "rating": 1,
      "title": "Disappointed",
      "content": "I search in private, yet my fakebook feed still advertises the things I search...",
      "author": "PavingGod",
      "date": "2025-08-28T18:49:28-07:00",
      "helpful_votes": 0,
      "app_id": "284882215"
    }
  ],
  "total_reviews": 3,
  "generated_at": "2025-08-30T19:25:13.435Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400`: Validation errors (invalid app_id, limit, etc.)
- `500`: Internal server errors
- `404`: Route not found

Error response format:
```json
{
  "error": "Validation Error",
  "message": "app_id must be a valid numeric string",
  "app_id": "invalid_id",
  "timestamp": "2025-08-30T19:25:13.435Z"
}
```

## Architecture

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **API**: iTunes RSS feed for reviews, iTunes lookup API for metadata
- **Deployment**: Vercel

## License

ISC
