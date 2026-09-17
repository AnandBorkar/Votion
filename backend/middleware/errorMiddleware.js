function errorHandler(err, req, res, next) {
  console.error(err);
  res
    .status(err.statusCode || 500)
    .json({ message: err.statusCode ? err.message : "Something went wrong" });
}
module.exports = errorHandler;
