import ReactGA from 'react-ga4';

// Инициализация Google Analytics
export const initGA = () => {
    const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;
    const isProduction = process.env.REACT_APP_NODE_ENV === 'production';

    
    // Включаем только в production или если явно задан ID
    if (measurementId && measurementId !== 'G-XXXXXXXXXX') {
        ReactGA.initialize(measurementId, {
            testMode: !isProduction, // В development - тестовый режим
            gaOptions: {
                debug_mode: !isProduction
            }
        });
        
        console.log(`📊 Google Analytics initialized: ${measurementId} (${isProduction ? 'Production' : 'Development'})`);
    } else {
        console.log('📊 Google Analytics disabled (no valid ID)');
    }
};

// Отследить просмотр страницы
export const trackPageView = (page) => {
    if (process.env.REACT_APP_GA_MEASUREMENT_ID) {
        ReactGA.send({ hitType: 'pageview', page });
    }
};

// Отследить событие
export const trackEvent = (category, action, label = '', value = 0) => {
    if (process.env.REACT_APP_GA_MEASUREMENT_ID) {
        ReactGA.event({
            category,
            action,
            label,
            value
        });
    }
};

// Специфичные события для Bruno Token
export const trackLogin = (method = 'email') => {
    trackEvent('Auth', 'Login', method);
};

export const trackSignup = (method = 'email') => {
    trackEvent('Auth', 'Signup', method);
};

export const trackTransaction = (type, amount, crypto) => {
    trackEvent('Transaction', type, crypto, amount);
};

export const trackVectorDestiny = (action, label = '') => {
    trackEvent('Vector of Destiny', action, label);
};

export const trackChallenge = (action, challengeId = '') => {
    trackEvent('Challenge', action, challengeId);
};

export const trackClubAvalanche = (action, program = '') => {
    trackEvent('Club Avalanche', action, program);
};