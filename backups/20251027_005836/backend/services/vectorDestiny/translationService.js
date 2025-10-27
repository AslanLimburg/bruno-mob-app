const OpenAI = require('openai');

// Инициализация OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

// Переводы названий языков
const LANGUAGE_NAMES = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ja: 'Japanese',
    ar: 'Arabic',
    pt: 'Portuguese',
    it: 'Italian'
};

// Кэш переводов (в памяти)
const translationCache = new Map();

// Получить ключ кэша
function getCacheKey(text, targetLang) {
    return `${targetLang}:${text}`;
}

// Перевести текст через OpenAI
async function translateText(text, targetLanguage) {
    // Если уже на английском или нет ключа API
    if (targetLanguage === 'en' || !process.env.OPENAI_API_KEY) {
        return text;
    }
    
    const cacheKey = getCacheKey(text, targetLanguage);
    
    // Проверяем кэш
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional translator. Translate the given text to ${languageName}. Provide ONLY the translation, no explanations or additional text.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.3,
            max_tokens: 200
        });
        
        const translation = response.choices[0].message.content.trim();
        
        // Сохраняем в кэш
        translationCache.set(cacheKey, translation);
        
        return translation;
        
    } catch (error) {
        console.error('Translation error:', error.message);
        // Fallback на оригинальный текст
        return text;
    }
}

// Перевести массив опций
async function translateOptions(options, targetLanguage) {
    if (targetLanguage === 'en' || !Array.isArray(options)) {
        return options;
    }
    
    try {
        const translations = await Promise.all(
            options.map(option => translateText(option, targetLanguage))
        );
        return translations;
    } catch (error) {
        console.error('Options translation error:', error);
        return options;
    }
}

// Перевести вопрос анкеты
async function translateQuestion(question, targetLanguage) {
    if (targetLanguage === 'en') {
        return question;
    }
    
    const translated = { ...question };
    
    try {
        // Переводим текст вопроса
        translated.question_text = await translateText(question.question_text, targetLanguage);
        
        // Переводим опции, если есть
        if (question.options) {
            const optionsArray = Array.isArray(question.options) 
                ? question.options 
                : JSON.parse(question.options || '[]');
                
            if (optionsArray.length > 0) {
                const translatedOptions = await translateOptions(optionsArray, targetLanguage);
                translated.options = translatedOptions;
            }
        }
        
        return translated;
        
    } catch (error) {
        console.error('Question translation error:', error);
        return question; // Fallback на оригинал
    }
}

// Перевести все вопросы
async function translateQuestions(questions, targetLanguage) {
    if (targetLanguage === 'en' || !questions || questions.length === 0) {
        return questions;
    }
    
    console.log(`🌍 Translating ${questions.length} questions to ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}...`);
    
    try {
        // Переводим параллельно для скорости, но с ограничением
        const batchSize = 5; // По 5 вопросов одновременно
        const translatedQuestions = [];
        
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            const translatedBatch = await Promise.all(
                batch.map(q => translateQuestion(q, targetLanguage))
            );
            translatedQuestions.push(...translatedBatch);
        }
        
        console.log(`✅ Translation completed: ${translatedQuestions.length} questions`);
        
        return translatedQuestions;
        
    } catch (error) {
        console.error('Batch translation error:', error);
        return questions; // Fallback на оригинал
    }
}

// Очистить кэш (для админ панели)
function clearTranslationCache() {
    translationCache.clear();
    console.log('🗑️ Translation cache cleared');
    return { success: true, message: 'Cache cleared' };
}

// Получить статистику кэша
function getCacheStats() {
    return {
        size: translationCache.size,
        languages: Array.from(new Set(
            Array.from(translationCache.keys()).map(k => k.split(':')[0])
        ))
    };
}

module.exports = {
    translateText,
    translateOptions,
    translateQuestion,
    translateQuestions,
    clearTranslationCache,
    getCacheStats,
    LANGUAGE_NAMES
};

