const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Путь к исходной иконке
const sourceIcon = path.join(__dirname, 'public/images/logo.png');

// Путь к директории Android ресурсов
const androidResPath = path.join(__dirname, 'android/app/src/main/res');

// Размеры для Android
const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
  console.log('🎨 Генерирую иконки для Android...\n');

  // Проверяем исходный файл
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Исходная иконка не найдена:', sourceIcon);
    process.exit(1);
  }

  for (const { folder, size } of sizes) {
    const dirPath = path.join(androidResPath, folder);
    
    // Создаём директорию если не существует
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const iconPath = path.join(dirPath, 'ic_launcher.png');
    const iconPathRound = path.join(dirPath, 'ic_launcher_round.png');

    try {
      // Генерируем квадратную иконку
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(iconPath);

      // Генерируем круглую иконку
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: Buffer.from(
            `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`
          ),
          blend: 'dest-in'
        }])
        .png()
        .toFile(iconPathRound);

      console.log(`✅ ${folder}: ${size}x${size} (квадратная и круглая)`);
    } catch (error) {
      console.error(`❌ Ошибка при создании ${folder}:`, error.message);
    }
  }

  console.log('\n🎉 Все иконки созданы!');
}

generateIcons().catch(err => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});

