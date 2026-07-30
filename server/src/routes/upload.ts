import { Router } from "express";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import { v4 as uuid } from "uuid";
import { env } from "../config/env.js";
import { createJob, updateJob } from "../services/jobStore.js";
import { Errors } from "../utils/AppError.js";

// ── Supported file types ───────────────────────────────────────────────────
// All formats Gemini can natively process — PDF, images, Office docs, and text.
// Gemini handles OCR, table extraction, and layout understanding for all of these.
const ACCEPTED_EXTENSIONS = [
  // PDF — digital, scanned, image-only, mixed
  ".pdf",

  // Images — Gemini performs native OCR
  ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif",
  ".tiff", ".tif", ".bmp", ".gif",

  // Microsoft Office — Gemini reads natively (text + tables + structure)
  ".docx", ".doc",
  ".xlsx", ".xls",

  // Rich Text
  ".rtf",

  // Plain text / data
  ".csv", ".txt", ".md",

  // Web markup
  ".html", ".htm",
];

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hiddenfeeai-${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      cb(Errors.unsupportedType(ext));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

/**
 * POST /api/upload
 * Accepts the document and creates a job.
 * The actual Gemini analysis happens when /analyze/:id/start is called (after payment).
 */
uploadRouter.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(Errors.tooLarge(env.maxUploadSizeMb));
      }
      return next(err);
    }

    const file = req.file;
    if (!file) {
      return next(Errors.badFile());
    }

    const auditId = uuid();
    const job = createJob(auditId, file.originalname);

    // Store file path — Gemini will read it directly when analysis starts
    updateJob(auditId, {
      status: "extracted",  // ready for analysis after payment
      filePath: file.path,
      fileMimeType: file.mimetype,
    });

    res.status(202).json({
      auditId,
      status: "extracted",
      fileName: file.originalname,
      fileSize: file.size,
    });
  });
});

export default uploadRouter;
