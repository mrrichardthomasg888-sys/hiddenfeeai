import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    if (err.debugMessage) {
      console.error(`[AppError] ${err.debugMessage}`);
    }
    return res.status(err.statusCode).json({ error: err.friendlyMessage });
  }

  console.error("[UnhandledError]", err);
  return res.status(500).json({
    error: "Something went wrong on our end. Please try again.",
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "That endpoint does not exist." });
}
