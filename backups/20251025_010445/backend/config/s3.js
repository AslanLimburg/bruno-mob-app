const { S3Client } = require('@aws-sdk/client-s3');

const s3Config = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Важно для Timeweb S3
};

const s3Client = new S3Client(s3Config);

module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET_NAME,
  publicUrl: process.env.S3_PUBLIC_URL,
};