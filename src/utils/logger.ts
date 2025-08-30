export class Logger {
  static info(message: string, context: string, data?: any) {
    console.log(`[INFO] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }

  static warn(message: string, context: string, data?: any) {
    console.warn(`[WARN] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }

  static error(message: string, context: string, data?: any, error?: Error) {
    console.error(`[ERROR] [${context}] ${message}`, {
      data: data ? JSON.stringify(data) : '',
      error: error?.message || '',
      stack: error?.stack || ''
    });
  }

  static debug(message: string, context: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] [${context}] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
}
