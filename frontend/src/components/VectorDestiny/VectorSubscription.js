import React, { useState } from 'react';
import axios from 'axios';

const VectorSubscription = ({ membershipLevel, profile, onComplete }) => {
    const [loading, setLoading] = useState(false);

    const prices = {
        'GS-I': 1,
        'GS-II': 2,
        'GS-III': 3,
        'GS-IV': 5
    };

    const handleStartTrial = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/vector/subscription/trial`,
                { membership_level: membershipLevel },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('🎉 7-day free trial activated!');
            onComplete();
        } catch (error) {
            console.error('Trial error:', error);
            alert(error.response?.data?.message || 'Failed to start trial');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/vector/subscription/subscribe`,
                { membership_level: membershipLevel },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('✅ Subscription activated!');
            onComplete();
        } catch (error) {
            console.error('Subscribe error:', error);
            alert(error.response?.data?.message || 'Failed to subscribe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vector-subscription">
            <div className="subscription-card">
                <h2>Choose Your Plan</h2>
                <p className="subtitle">Get weekly personalized forecasts</p>

                <div className="pricing-box">
                    <div className="price-tag">
                        <span className="price-amount">{prices[membershipLevel]}</span>
                        <span className="price-currency">BRT/month</span>
                    </div>
                    
                    <div className="plan-features">
                        <div className="feature">✓ Weekly forecasts in your language</div>
                        <div className="feature">✓ Personalized birth chart analysis</div>
                        <div className="feature">✓ Love, career & wellness guidance</div>
                        <div className="feature">✓ Lucky days & spiritual insights</div>
                        {membershipLevel === 'GS-IV' && (
                            <div className="feature premium">⭐ Priority support</div>
                        )}
                    </div>
                </div>

                <div className="trial-offer">
                    <h3>🎁 Special Offer</h3>
                    <p>Try FREE for 7 days, then {prices[membershipLevel]} BRT/month</p>
                </div>

                <button 
                    className="btn-trial" 
                    onClick={handleStartTrial}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : 'Start 7-Day Free Trial'}
                </button>

                <button 
                    className="btn-subscribe-now" 
                    onClick={handleSubscribe}
                    disabled={loading}
                >
                    Subscribe Now (Skip Trial)
                </button>

                <p className="terms">Cancel anytime. No refunds.</p>
            </div>
        </div>
    );
};

export default VectorSubscription;