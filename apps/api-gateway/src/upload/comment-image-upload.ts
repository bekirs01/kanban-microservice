import { BadRequestException } from "@nestjs/common";
import type { MulterModuleOptions } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { diskStorage } from "multer";

import { COMMENT_IMAGES_DIR } from "./upload.paths";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const ALLOWED_TYPES = Object.keys(MIME_EXT);

export const COMMENT_IMAGE_UPLOAD_LIMIT = 5 * 1024 * 1024;

export type CommentUploadLike = {
  mimetype: string;
  originalname: string;
  filename?: string;
};

export function commentImageFileFilter(
  _req: unknown,
  file: CommentUploadLike,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    cb(
      new BadRequestException({
        statusCode: 400,
        message: "INVALID_IMAGE_TYPE",
      }),
      false,
    );
    return;
  }
  cb(null, true);
}

export function commentImageMulterStorage() {
  return diskStorage({
    destination: COMMENT_IMAGES_DIR,
    filename: (_req, file, cb) => {
      const suffix = MIME_EXT[file.mimetype] ?? ".bin";
      cb(null, `${randomUUID()}${suffix}`);
    },
  });
}

export const commentImageUploadOptions: MulterModuleOptions = {
  storage: commentImageMulterStorage(),
  fileFilter: commentImageFileFilter,
  limits: { fileSize: COMMENT_IMAGE_UPLOAD_LIMIT },
};
