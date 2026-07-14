import { Router } from "express";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import { v4 as uuid } from "uuid";
import { env } from "@/config/env.js";
import { extractText } from "@/services/extractor.js";
import { createJob, updateJob } from "@/services/jobStore.js";
import { Errors } from "@/utils/AppError.js";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".tiff", ".tif",
  ".docx", ".doc", ".txt", ".csv", ".xlsx", ".xls", ".xlsm",
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
    job.filePath = file.path;
    job.status = "uploading";

    // Start extraction asynchronously
    extractText(file.path, file.originalname)
      .then((result) => {
        updateJob(auditId, {
          status: "extracted",
          extractedText: result.text,
          documentContext: {
            pages: result.pages,
            lineItems: result.lineItems,
            fileType: result.fileType,
          },
        });
      })
      .catch((extractError) => {
        updateJob(auditId, {
          status: "error",
          error: extractError instanceof Error ? extractError.message : "Extraction failed",
        });
      });

    res.status(202).json({
      auditId,
      status: "uploading",
      fileName: file.originalname,
      fileSize: file.size,
    });
  });
});

export default uploadRouter;