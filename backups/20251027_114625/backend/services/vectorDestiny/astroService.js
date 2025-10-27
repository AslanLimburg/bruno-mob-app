const SunCalc = require('suncalc');
const moment = require('moment-timezone');

// Знаки зодиака
const ZODIAC_SIGNS = [
    { name: 'Aries', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
    { name: 'Taurus', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
    { name: 'Gemini', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
    { name: 'Cancer', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
    { name: 'Leo', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
    { name: 'Virgo', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
    { name: 'Libra', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
    { name: 'Scorpio', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
    { name: 'Sagittarius', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
    { name: 'Capricorn', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
    { name: 'Aquarius', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
    { name: 'Pisces', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 }
];

// Вычислить знак Солнца (Sun Sign)
const calculateSunSign = (birthDate) => {
    const date = new Date(birthDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    for (const sign of ZODIAC_SIGNS) {
        if (month === sign.startMonth && day >= sign.startDay) {
            return sign.name;
        }
        if (month === sign.endMonth && day <= sign.endDay) {
            return sign.name;
        }
    }
    
    return 'Capricorn'; // fallback
};

// Вычислить знак Луны (упрощенный расчет)
const calculateMoonSign = (birthDate, latitude, longitude) => {
    try {
        const date = new Date(birthDate);
        const moonPos = SunCalc.getMoonPosition(date, latitude, longitude);
        
        // Упрощенный расчет: делим круг на 12 частей
        const azimuthDegrees = (moonPos.azimuth * 180 / Math.PI + 360) % 360;
        const signIndex = Math.floor(azimuthDegrees / 30);
        
        return ZODIAC_SIGNS[signIndex % 12].name;
    } catch (error) {
        console.error('Moon sign calculation error:', error);
        return calculateSunSign(birthDate); // fallback to sun sign
    }
};

// Вычислить Rising Sign (Ascendant) - требует точное время
const calculateRisingSign = (birthDate, birthTime, latitude, longitude, timezone) => {
    try {
        if (!birthTime) return null;
        
        // Создаем полную дату со временем
        const dateTimeStr = `${birthDate}T${birthTime}`;
        const dateTime = moment.tz(dateTimeStr, timezone);
        
        // Упрощенный расчет восходящего знака
        const hour = dateTime.hour();
        const sunSign = calculateSunSign(birthDate);
        const sunSignIndex = ZODIAC_SIGNS.findIndex(s => s.name === sunSign);
        
        // Rising sign меняется примерно каждые 2 часа
        const risingOffset = Math.floor(hour / 2);
        const risingIndex = (sunSignIndex + risingOffset) % 12;
        
        return ZODIAC_SIGNS[risingIndex].name;
    } catch (error) {
        console.error('Rising sign calculation error:', error);
        return null;
    }
};

// Основная функция - вычислить натальную карту
const calculateBirthChart = async (birthData) => {
    try {
        const {
            birth_date,
            birth_time,
            birth_latitude,
            birth_longitude,
            birth_timezone
        } = birthData;
        
        // Sun Sign (обязательно)
        const sunSign = calculateSunSign(birth_date);
        
        // Moon Sign (если есть координаты)
        const moonSign = birth_latitude && birth_longitude
            ? calculateMoonSign(birth_date, birth_latitude, birth_longitude)
            : sunSign;
        
        // Rising Sign (если есть время и координаты)
        const risingSign = birth_time && birth_latitude && birth_longitude && birth_timezone
            ? calculateRisingSign(birth_date, birth_time, birth_latitude, birth_longitude, birth_timezone)
            : null;
        
        // Формируем результат
        const birthChart = {
            sunSign,
            moonSign,
            risingSign,
            calculatedAt: new Date().toISOString(),
            hasFullChart: !!(birth_time && birth_latitude && birth_longitude)
        };
        
        return {
            success: true,
            data: birthChart
        };
        
    } catch (error) {
        console.error('Birth chart calculation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Получить описание знака
const getZodiacDescription = (sign) => {
    const descriptions = {
        'Aries': 'Bold, energetic, pioneering',
        'Taurus': 'Stable, reliable, sensual',
        'Gemini': 'Communicative, curious, adaptable',
        'Cancer': 'Nurturing, emotional, protective',
        'Leo': 'Confident, creative, generous',
        'Virgo': 'Analytical, practical, helpful',
        'Libra': 'Harmonious, diplomatic, artistic',
        'Scorpio': 'Intense, passionate, transformative',
        'Sagittarius': 'Adventurous, philosophical, optimistic',
        'Capricorn': 'Ambitious, disciplined, responsible',
        'Aquarius': 'Innovative, independent, humanitarian',
        'Pisces': 'Intuitive, compassionate, mystical'
    };
    
    return descriptions[sign] || '';
};

module.exports = {
    calculateBirthChart,
    calculateSunSign,
    calculateMoonSign,
    calculateRisingSign,
    getZodiacDescription,
    ZODIAC_SIGNS
};