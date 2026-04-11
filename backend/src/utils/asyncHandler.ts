import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps async route handlers and forwards exceptions to Express error middleware.
 */
const asyncHandler = <TRequest extends Request = Request>(
  handler: (req: TRequest, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: TRequest, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
};

export default asyncHandler;
