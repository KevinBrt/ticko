/**
 * An expected failure with a stable machine-readable code, answered as-is by the error handler.
 * Use it for 4xx outcomes; unexpected errors stay plain `Error`s and become a generic 500.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
