const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName, publicUrl } = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

/**
 * Загрузить файл в S3
 * @param {Buffer} fileBuffer - Буфер файла
 * @param {string} originalName - Оригинальное имя файла
 * @param {string} folder - Папка в бакете (avatars, documents, etc)
 * @returns {Promise<string>} - URL загруженного файла
 */
async function uploadFile(fileBuffer, originalName, folder = 'uploads') {
  try {
    // Генерируем уникальное имя файла
    const fileExt = path.extname(originalName);
    const fileName = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExt}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: getContentType(fileExt),
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Возвращаем публичный URL
    return `${publicUrl}/${fileName}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Удалить файл из S3
 * @param {string} fileUrl - URL файла
 */
async function deleteFile(fileUrl) {
  try {
    // Извлекаем Key из URL
    const key = fileUrl.replace(`${publicUrl}/`, '');

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Получить подписанный URL для приватного файла
 * @param {string} key - Ключ файла в S3
 * @param {number} expiresIn - Время жизни ссылки в секундах (по умолчанию 1 час)
 */
async function getSignedFileUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Определить Content-Type по расширению файла
 */
function getContentType(fileExt) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
  };

  return mimeTypes[fileExt.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  uploadFile,
  deleteFile,
  getSignedFileUrl,
};