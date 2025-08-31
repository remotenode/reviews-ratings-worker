export class Validators {
  static isValidAppId(appId: string): boolean {
    // App Store app IDs are numeric strings
    return /^\d+$/.test(appId) && appId.length > 0;
  }

  static isValidLimit(limit: number): boolean {
    return Number.isInteger(limit) && limit > 0 && limit <= 200;
  }

  static validateReviewsRequest(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.app_id) {
      errors.push('app_id is required');
    } else if (!this.isValidAppId(data.app_id)) {
      errors.push('app_id must be a valid numeric string');
    }

    if (data.limit !== undefined && !this.isValidLimit(data.limit)) {
      errors.push('limit must be a positive integer between 1 and 200');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateMultipleAppsRequest(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.app_ids || !Array.isArray(data.app_ids)) {
      errors.push('app_ids must be an array');
    } else if (data.app_ids.length === 0) {
      errors.push('app_ids array cannot be empty');
    } else if (data.app_ids.length > 20) {
      errors.push('app_ids array cannot contain more than 20 items');
    } else {
      for (const appId of data.app_ids) {
        if (!this.isValidAppId(appId)) {
          errors.push(`Invalid app_id: ${appId}`);
        }
      }
    }

    if (data.limit !== undefined && !this.isValidLimit(data.limit)) {
      errors.push('limit must be a positive integer between 1 and 200');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeAppId(appId: string): string {
    return appId.trim();
  }

  static sanitizeLimit(limit: number, maxLimit: number = 200): number {
    return Math.min(Math.max(1, Math.floor(limit)), maxLimit);
  }
}
