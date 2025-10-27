// =====================================================
// BRT STARS CHALLENGE - CLEANUP SCHEDULER
// backend/services/starsCleanupScheduler.js
// =====================================================

const StarsPhotoService = require('./starsPhotoService');
const StarsGalleryService = require('./starsGalleryService');

/**
 * Очистка истёкших фото и победителей галереи
 * Запускается каждый день в 00:00
 */
function startStarsCleanup() {
  console.log('🧹 Stars Cleanup Scheduler started (runs daily at 00:00)');
  
  // Запустить сразу при старте (для тестирования)
  // runCleanup();
  
  // Запускать каждый день в 00:00
  const msUntilMidnight = getMsUntilMidnight();
  
  setTimeout(() => {
    runCleanup();
    
    // После первого запуска - повторять каждые 24 часа
    setInterval(() => {
      runCleanup();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

/**
 * Выполнить очистку
 */
async function runCleanup() {
  console.log('🧹 Running Stars Cleanup...');
  
  try {
    // 1. Удалить истёкшие фото (старше 365 дней)
    const photosResult = await StarsPhotoService.deleteExpiredPhotos();
    console.log(`✅ Deleted ${photosResult.deleted_count} expired photos`);
    
    // 2. Удалить истёкших победителей галереи (старше 365 дней)
    const winnersResult = await StarsGalleryService.deleteExpiredWinners();
    console.log(`✅ Deleted ${winnersResult.deleted_count} expired gallery winners`);
    
    console.log('✅ Stars Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Stars Cleanup error:', error);
  }
}

/**
 * Вспомогательная функция - получить миллисекунды до полуночи
 */
function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

module.exports = {
  startStarsCleanup,
  runCleanup
};