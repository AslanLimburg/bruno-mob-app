import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VectorForecast = ({ profile, subscription }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadLatestForecast();
    }, []);

    const loadLatestForecast = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/vector/forecast`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setForecast(response.data.data);
            }
        } catch (error) {
            console.error('Load forecast error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateNewForecast = async () => {
        try {
            setGenerating(true);
            const token = localStorage.getItem('token');
            
            await axios.post(
                `${process.env.REACT_APP_API_URL}/api/vector/forecast/generate`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('✨ New forecast generated!');
            loadLatestForecast();
        } catch (error) {
            console.error('Generate forecast error:', error);
            alert(error.response?.data?.message || 'Failed to generate forecast');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading your forecast...</div>;
    }

    return (
        <div className="vector-forecast">
            <div className="forecast-header">
                <h2>✨ Your Forecast</h2>
                <div className="forecast-meta">
                    <span>Level: {subscription?.level}</span>
                    <span>Language: {profile?.language?.toUpperCase()}</span>
                </div>
            </div>

            {forecast ? (
                <div className="forecast-content">
                    <div className="forecast-date">
                        Week of {new Date(forecast.forecast_period_start).toLocaleDateString()} - 
                        {new Date(forecast.forecast_period_end).toLocaleDateString()}
                    </div>

                    <div className="forecast-text">
                        {forecast.forecast_text.split('\n').map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                        ))}
                    </div>

                    <div className="forecast-footer">
                        <small>Generated: {new Date(forecast.created_at).toLocaleString()}</small>
                    </div>
                </div>
            ) : (
                <div className="no-forecast">
                    <p>No forecast available yet.</p>
                    <button className="btn-generate" onClick={generateNewForecast} disabled={generating}>
                        {generating ? 'Generating...' : 'Generate My First Forecast'}
                    </button>
                </div>
            )}

            {forecast && (
                <button className="btn-regenerate" onClick={generateNewForecast} disabled={generating}>
                    {generating ? 'Generating...' : '🔄 Generate New Forecast'}
                </button>
            )}

            <div className="subscription-info">
                <p>Subscription: {subscription?.status}</p>
                <p>Next billing: {subscription?.next_billing_date}</p>
                <p>Forecasts received: {subscription?.forecasts_received || 0}</p>
            </div>
        </div>
    );
};

export default VectorForecast;