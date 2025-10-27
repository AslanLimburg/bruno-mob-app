// Number Picker Component
// Path: ~/bruno-token-app/frontend/src/components/Lottery/NumberPicker.jsx

import React from 'react';
import './Lottery.css';

const NumberPicker = ({ selectedNumbers, setSelectedNumbers }) => {
  
  const handleWhiteClick = (num) => {
    const { white } = selectedNumbers;
    
    if (white.includes(num)) {
      setSelectedNumbers({
        ...selectedNumbers,
        white: white.filter(n => n !== num)
      });
    } else {
      if (white.length < 5) {
        setSelectedNumbers({
          ...selectedNumbers,
          white: [...white, num]
        });
      }
    }
  };
  
  const handlePowerballClick = (num) => {
    if (selectedNumbers.powerball === num) {
      setSelectedNumbers({
        ...selectedNumbers,
        powerball: null
      });
    } else {
      setSelectedNumbers({
        ...selectedNumbers,
        powerball: num
      });
    }
  };
  
  const whiteBalls = Array.from({ length: 69 }, (_, i) => i + 1);
  const powerballs = Array.from({ length: 26 }, (_, i) => i + 1);
  
  return (
    <div className="number-picker">
      <div className="picker-section">
        <h3>5 White Balls (1-69)</h3>
        
        <div className="selected-numbers">
          {selectedNumbers.white.length > 0 ? (
            selectedNumbers.white.sort((a, b) => a - b).map(num => (
              <span key={num} className="selected-ball white">
                {num}
              </span>
            ))
          ) : (
            <span className="placeholder">Select 5 numbers</span>
          )}
          <span className="counter">
            ({selectedNumbers.white.length}/5)
          </span>
        </div>
        
        <div className="ball-grid">
          {whiteBalls.map(num => (
            <button
              key={num}
              className={`ball white ${selectedNumbers.white.includes(num) ? 'selected' : ''}`}
              onClick={() => handleWhiteClick(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      <div className="picker-section">
        <h3>1 Powerball (1-26)</h3>
        
        <div className="selected-numbers">
          {selectedNumbers.powerball ? (
            <span className="selected-ball powerball">
              {selectedNumbers.powerball}
            </span>
          ) : (
            <span className="placeholder">Select 1 number</span>
          )}
        </div>
        
        <div className="ball-grid">
          {powerballs.map(num => (
            <button
              key={num}
              className={`ball powerball ${selectedNumbers.powerball === num ? 'selected' : ''}`}
              onClick={() => handlePowerballClick(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NumberPicker;