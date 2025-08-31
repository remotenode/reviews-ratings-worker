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
