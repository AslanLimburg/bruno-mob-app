import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VectorOnboarding from './VectorOnboarding';
import VectorSurvey from './VectorSurvey';
import VectorForecast from './VectorForecast';
import VectorSubscription from './VectorSubscription';
import './VectorDestiny.css';

const VectorDestiny = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [membershipLevel, setMembershipLevel] = useState(null);
    const [profile, setProfile] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [currentStep, setCurrentStep] = useState('loading');

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Проверяем доступ
            const accessRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/vector/access`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('🔑 Access response:', accessRes.data);

            if (!accessRes.data.hasAccess) {
                setCurrentStep('no-access');
                setLoading(false);
                return;
            }

            setHasAccess(true);
            setMembershipLevel(accessRes.data.level);

            // Проверяем профиль
            const profileRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/vector/profile`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('📋 Profile response:', profileRes.data);

            if (profileRes.data.success) {
                setProfile(profileRes.data.data);
            }

            // Проверяем подписку
            const subRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/vector/subscription`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('💳 Subscription response:', subRes.data);
            setSubscription(subRes.data.data);

            // Определяем шаг
            if (!profileRes.data.success) {
                console.log('❌ No profile found, staying on survey');
                setCurrentStep('survey');
            } else if (!subRes.data.data.active) {
                console.log('✅ Profile exists, moving to subscription');
                setCurrentStep('subscription');
            } else {
                console.log('✅ Subscription active, moving to forecast');
                setCurrentStep('forecast');
            }

            setLoading(false);

        } catch (error) {
            console.error('❌ Check access error:', error);
            setLoading(false);
        }
    };

    const handleSurveyComplete = async () => {
        console.log('🎯 Survey completed! Switching to subscription...');
        setCurrentStep('subscription');
        
        // Даем время серверу сохранить профиль
        setTimeout(async () => {
            console.log('🔄 Reloading access data...');
            await checkAccess();
        }, 1000);
    };

    const handleSubscriptionComplete = () => {
        console.log('💳 Subscription completed! Switching to forecast...');
        setCurrentStep('forecast');
        checkAccess();
    };

    if (loading) {
        return (
            <div className="vector-destiny-container">
                <div className="loading-spinner">✨ Loading...</div>
            </div>
        );
    }

    if (currentStep === 'no-access') {
        return <VectorOnboarding onUpgrade={() => navigate('/club-avalanche')} />;
    }

    return (
        <div className="vector-destiny-container">
            <div className="vector-header">
                <button className="back-button" onClick={() => navigate('/dashboard')}>
                    ← Back to Dashboard
                </button>
                <h1>✨ Vector of Destiny</h1>
                <p>Your personalized astrological guidance</p>
            </div>

            {currentStep === 'survey' && (
                <VectorSurvey 
                    membershipLevel={membershipLevel}
                    onComplete={handleSurveyComplete}
                />
            )}

            {currentStep === 'subscription' && (
                <VectorSubscription
                    membershipLevel={membershipLevel}
                    profile={profile}
                    onComplete={handleSubscriptionComplete}
                />
            )}

            {currentStep === 'forecast' && (
                <VectorForecast
                    profile={profile}
                    subscription={subscription}
                />
            )}
        </div>
    );
};

export default VectorDestiny;