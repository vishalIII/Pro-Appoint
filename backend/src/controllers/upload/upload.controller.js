const AppError = require("../../utils/appError");
const cloudinary = require("../../config/cloudinary");

const ALLOWED_FOLDERS = ["services", "shops"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME_PREFIX = "image/";
const DERIVED_TRANSFORM = "f_auto,q_auto,w_500";

exports.getUploadSignature = async (req, res, next) => {
  try {
    const { folder = "services", fileType, fileSize } = req.body || {};

    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new AppError("Invalid upload folder", 400);
    }

    if (fileType && !String(fileType).startsWith(ALLOWED_IMAGE_MIME_PREFIX)) {
      throw new AppError("Only image uploads are allowed", 400);
    }

    if (
      fileSize !== undefined &&
      Number.isFinite(Number(fileSize)) &&
      Number(fileSize) > MAX_FILE_SIZE_BYTES
    ) {
      throw new AppError("File exceeds 5MB limit", 400);
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Keep signature minimal to avoid mismatches
    const uploadParams = {
      timestamp,
      folder,
      eager: DERIVED_TRANSFORM,
    };

    const signature = cloudinary.utils.api_sign_request(
      uploadParams,
      process.env.CLOUDINARY_API_SECRET,
    );

    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      eager: DERIVED_TRANSFORM,
      maxFileSize: MAX_FILE_SIZE_BYTES,
    });
  } catch (error) {
    next(error);
  }
};
