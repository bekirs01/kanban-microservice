import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export const COMMENT_IMAGES_SUBDIR = "comment-images";

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

export const COMMENT_IMAGES_DIR = join(UPLOAD_ROOT, COMMENT_IMAGES_SUBDIR);

export function ensureUploadDirsSync(): void {
  if (!existsSync(COMMENT_IMAGES_DIR)) {
    mkdirSync(COMMENT_IMAGES_DIR, { recursive: true });
  }
}

export function storedCommentImageRelativeUrl(filename: string): string {
  return `/api/uploads/${COMMENT_IMAGES_SUBDIR}/${filename}`;
}
