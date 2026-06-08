import { Request, Response, NextFunction } from "express";
import UnloggingError from "@/utils/unlogging-error";
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof UnloggingError) { res.status(400).json({ success: false, field: err.field, message: err.message }); return; }
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error." });
}
export function notFound(_req: Request, res: Response) { res.status(404).json({ success: false, message: "Route not found." }); }