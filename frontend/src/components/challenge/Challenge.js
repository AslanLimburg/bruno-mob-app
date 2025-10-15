import React, { useState } from 'react';
import CreateChallenge from './CreateChallenge';
import BrowseChallenges from './BrowseChallenges';
import MyBets from './MyBets';
import MyChallenges from './MyChallenges';
import './Challenge.css';

function Challenge() {
  const [activeTab, setActiveTab] = useState('browse');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return <BrowseChallenges />;
      case 'create':
        return <CreateChallenge />;
      case 'mybets':
        return <MyBets />;
      case 'mychallenges':
        return <MyChallenges />;
      default:
        return <BrowseChallenges />;
    }
  };

  return (
    <div className="challenge-container">
      <div className="challenge-header">
        <h1>🎯 Challenge 2.0</h1>
        <p>Create predictions, place bets, win prizes!</p>
      </div>

      <div className="challenge-tabs">
        <button
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          🔍 Browse
        </button>
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ✨ Create
        </button>
        <button
          className={`tab-button ${activeTab === 'mybets' ? 'active' : ''}`}
          onClick={() => setActiveTab('mybets')}
        >
          💰 My Bets
        </button>
        <button
          className={`tab-button ${activeTab === 'mychallenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('mychallenges')}
        >
          🏆 My Challenges
        </button>
      </div>

      <div className="challenge-content">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default Challenge;
