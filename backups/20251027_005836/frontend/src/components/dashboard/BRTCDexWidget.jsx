// BRTC DEX Live Data Widget Component
// Path: frontend/src/components/dashboard/BRTCDexWidget.jsx

import React, { useState, useEffect } from 'react';
import dexService from '../../services/dexService';
import './BRTCDexWidget.css';

const BRTCDexWidget = () => {
  const [dexData, setDexData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadDexData();
    
    // Обновление данных каждые 30 секунд
    const interval = setInterval(loadDexData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDexData = async () => {
    try {
      const result = await dexService.getBRTCData();
      
      if (result.success) {
        setDexData(result.data);
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load DEX data');
      console.error('DEX data error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dex-widget">
        <div className="dex-loading">
          <div className="spinner"></div>
          <p>Loading BRTC market data...</p>
        </div>
      </div>
    );
  }

  if (error || !dexData) {
    return (
      <div className="dex-widget">
        <div className="dex-header">
          <div className="dex-title">
            <h3>📈 BRTC Live Market Data</h3>
          </div>
          <div className="coming-soon-indicator">
            <span>Coming Soon</span>
          </div>
        </div>
        <div className="dex-error">
          <p>Token will be available after DEX listing</p>
        </div>
      </div>
    );
  }

  const priceChangeClass = dexService.isPriceChangePositive(dexData.priceChange24h) 
    ? 'positive' 
    : 'negative';

  return (
    <div className="dex-widget">
      <div className="dex-header">
        <div className="dex-title">
          <h3>📈 BRTC Live Market Data</h3>
        </div>
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>LIVE</span>
        </div>
      </div>

      <div className="dex-data">
        <div className="dex-data-item">
          <div className="dex-data-label">Price</div>
          <div className="dex-data-value">${dexData.price.toFixed(6)}</div>
          <div className={`dex-data-change ${priceChangeClass}`}>
            {dexService.formatPercentage(dexData.priceChange24h)} 24h
          </div>
        </div>

        <div className="dex-data-item">
          <div className="dex-data-label">Market Cap</div>
          <div className="dex-data-value">
            {dexService.formatNumber(dexData.marketCap)}
          </div>
        </div>

        <div className="dex-data-item">
          <div className="dex-data-label">Volume 24h</div>
          <div className="dex-data-value">
            {dexService.formatNumber(dexData.volume24h)}
          </div>
          {dexData.txns24h && (
            <div className="dex-data-subtitle">
              {dexData.txns24h.buys + dexData.txns24h.sells} txns
            </div>
          )}
        </div>

        <div className="dex-data-item">
          <div className="dex-data-label">Liquidity</div>
          <div className="dex-data-value">
            {dexService.formatNumber(dexData.liquidity)}
          </div>
        </div>

        <div className="dex-data-item">
          <div className="dex-data-label">FDV</div>
          <div className="dex-data-value">
            {dexService.formatNumber(dexData.fdv)}
          </div>
        </div>

        {dexData.holders && (
          <div className="dex-data-item">
            <div className="dex-data-label">Holders</div>
            <div className="dex-data-value">
              {dexData.holders.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {dexData.url && (
        <div className="dex-footer">
          <a 
            href={dexData.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="dex-link"
          >
            View on {dexData.dexId} →
          </a>
        </div>
      )}
    </div>
  );
};

export default BRTCDexWidget;
