import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VectorSurvey = ({ membershipLevel, onComplete }) => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentBlock, setCurrentBlock] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/vector/questions?level=${membershipLevel}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setQuestions(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Load questions error:', error);
            alert('Failed to load questions');
        }
    };

    const handleAnswer = (questionKey, value) => {
        setAnswers({ ...answers, [questionKey]: value });
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Маппинг языков из выбора в коды
            const languageMap = {
                'English 🇬🇧': 'en',
                'Русский 🇷🇺': 'ru',
                'العربية 🇦🇪': 'ar',
                'Español 🇪🇸': 'es',
                '中文 🇨🇳': 'zh',
                'हिंदी 🇮🇳': 'hi',
                'Français 🇫🇷': 'fr',
                'Deutsch 🇩🇪': 'de'
            };
            
            // Формируем данные профиля
            const profileData = {
                full_name: answers.full_name,
                gender: answers.gender,
                birth_date: answers.birth_date,
                birth_time: answers.birth_time || null,
                birth_place_city: answers.birth_city,
                birth_place_country: answers.birth_country,
                focus_areas: answers.focus_areas || [],
                life_phase: answers.life_phase,
                responses: answers,
                language: languageMap[answers.preferred_language] || 'en'
            };

            console.log('📤 Sending profile data:', profileData);

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/vector/profile`,
                profileData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('📥 Profile creation response:', response.data);

            if (response.data.success) {
                console.log('✅ Profile created successfully! ✨');
                onComplete();
            } else {
                alert('Failed to create profile: ' + response.data.message);
            }
        } catch (error) {
            console.error('❌ Submit error:', error);
            console.error('❌ Error response:', error.response?.data);
            alert(error.response?.data?.message || 'Failed to create profile');
        }
    };

    const renderQuestion = (question) => {
        switch (question.question_type) {
            case 'text':
            case 'date':
            case 'time':
                return (
                    <input
                        type={question.question_type}
                        className="survey-input"
                        value={answers[question.question_key] || ''}
                        onChange={(e) => handleAnswer(question.question_key, e.target.value)}
                        required={question.is_required}
                    />
                );
            
            case 'choice':
                const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]');
                return (
                    <div className="choice-options">
                        {options.map((option, idx) => (
                            <button
                                key={idx}
                                className={`choice-btn ${answers[question.question_key] === option ? 'active' : ''}`}
                                onClick={() => handleAnswer(question.question_key, option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );
            
            case 'scale':
                return (
                    <div className="scale-container">
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={answers[question.question_key] || 3}
                            onChange={(e) => handleAnswer(question.question_key, parseInt(e.target.value))}
                            className="scale-slider"
                        />
                        <div className="scale-value">{answers[question.question_key] || 3}/5</div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading questions...</div>;
    }

    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(answers).length;
    const progress = (answeredQuestions / totalQuestions) * 100;

    return (
        <div className="vector-survey">
            <div className="survey-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>{answeredQuestions} / {totalQuestions} questions answered</p>
            </div>

            <div className="survey-questions">
                {questions.map((question, idx) => (
                    <div key={question.id} className="question-card">
                        <h4>{idx + 1}. {question.question_text}</h4>
                        {renderQuestion(question)}
                    </div>
                ))}
            </div>

            <button 
                className="btn-submit" 
                onClick={handleSubmit}
                disabled={answeredQuestions < 5}
            >
                Complete Survey ✨
            </button>
        </div>
    );
};

export default VectorSurvey;