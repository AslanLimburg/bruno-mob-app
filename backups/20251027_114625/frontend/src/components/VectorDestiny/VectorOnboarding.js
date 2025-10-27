import React from 'react';

const VectorOnboarding = ({ onUpgrade }) => {
    return (
        <div className="vector-onboarding">
            <div className="onboarding-card">
                <div className="cosmic-icon">🌟</div>
                <h2>Welcome to Vector of Destiny</h2>
                <p className="subtitle">Unlock your personalized astrological guidance</p>
                
                <div className="feature-list">
                    <div className="feature-item">
                        <span className="feature-icon">✨</span>
                        <div>
                            <h4>Personalized Forecasts</h4>
                            <p>Weekly predictions tailored to your birth chart</p>
                        </div>
                    </div>
                    
                    <div className="feature-item">
                        <span className="feature-icon">🌙</span>
                        <div>
                            <h4>Deep Insights</h4>
                            <p>Understand your path through celestial wisdom</p>
                        </div>
                    </div>
                    
                    <div className="feature-item">
                        <span className="feature-icon">🔮</span>
                        <div>
                            <h4>AI-Powered Analysis</h4>
                            <p>Advanced astrology meets modern technology</p>
                        </div>
                    </div>
                </div>

                <div className="access-required">
                    <p>⚠️ Club Avalanche membership required</p>
                </div>

                <button className="btn-upgrade" onClick={onUpgrade}>
                    Join Club Avalanche
                </button>
            </div>
        </div>
    );
};

export default VectorOnboarding;