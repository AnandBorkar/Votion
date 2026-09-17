function uploadImage(req, res, next) {
  if (!req.file)
    return res
      .status(400)
      .json({
        message: "Please select a valid image (JPEG, PNG, WEBP, or GIF)",
      });
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  )
    return res
      .status(503)
      .json({
        message:
          "Image uploads are not configured. Add Cloudinary credentials.",
      });
  try {
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "votion/products",
        resource_type: "image",
        transformation: [
          {
            width: 1200,
            height: 1500,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) return next(error);
        return res.json({ url: result.secure_url });
      },
    );
    stream.end(req.file.buffer);
  } catch (error) {
    next(error);
  }
}
module.exports = { uploadImage };
