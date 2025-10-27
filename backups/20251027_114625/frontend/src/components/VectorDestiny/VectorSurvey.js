import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VectorSurvey = ({ membershipLevel, onComplete }) => {
    const [step, setStep] = useState('language'); // 'language' or 'survey'
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);

    const languageOptions = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ar', name: 'العربية', flag: '🇦🇪' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' }
    ];

    const selectLanguage = async (lang) => {
        setSelectedLanguage(lang);
        setLoading(true);
        
        try {
            await loadQuestions(lang.code);
            setStep('survey');
        } catch (error) {
            console.error('Error loading questions:', error);
            alert('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const loadQuestions = async (languageCode) => {
        try {
            const token = localStorage.getItem('token');
            
            // Передаем язык в запросе для автоматического перевода
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/vector/questions?level=${membershipLevel}&language=${languageCode}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            let questionsData = response.data.data || [];
            
            // Убираем вопрос о языке (он уже был выбран на первом экране)
            questionsData = questionsData.filter(q => q.category !== 'language');
            
            console.log(`✅ Loaded ${questionsData.length} questions in ${languageCode}`);
            
            setQuestions(questionsData);
        } catch (error) {
            throw error;
        }
    };

    const handleAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Формируем данные профиля
            const profileData = {
                language: selectedLanguage.code,
                responses: answers
            };
            
            // Добавляем обязательные поля из ответов
            const requiredFields = ['full_name', 'gender', 'birth_date', 'birth_time', 
                                   'birth_place_city', 'birth_place_country'];
            
            questions.forEach(q => {
                const key = q.id;
                const value = answers[key];
                
                if (value) {
                    // Определяем поле по тексту вопроса или category
                    if (q.question_text.toLowerCase().includes('name')) {
                        profileData.full_name = value;
                    } else if (q.question_text.toLowerCase().includes('gender')) {
                        profileData.gender = value;
                    } else if (q.question_text.toLowerCase().includes('date of birth')) {
                        profileData.birth_date = value;
                    } else if (q.question_text.toLowerCase().includes('time') && q.question_text.toLowerCase().includes('born')) {
                        profileData.birth_time = value;
                    } else if (q.question_text.toLowerCase().includes('city') && q.question_text.toLowerCase().includes('born')) {
                        profileData.birth_place_city = value;
                    } else if (q.question_text.toLowerCase().includes('country') && q.question_text.toLowerCase().includes('born')) {
                        profileData.birth_place_country = value;
                    }
                    
                    // Специальные поля
                    if (q.category === 'interests' && Array.isArray(value)) {
                        profileData.focus_areas = value;
                    }
                    if (q.category === 'life_phase') {
                        profileData.life_phase = value;
                    }
                    if (q.category === 'personality') {
                        profileData.personality_style = value;
                    }
                }
            });

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
        const questionId = question.id;
        const answer = answers[questionId];
        
        switch (question.question_type) {
            case 'text':
                return (
                    <input
                        type="text"
                        className="survey-input"
                        value={answer || ''}
                        onChange={(e) => handleAnswer(questionId, e.target.value)}
                        required={question.required}
                        placeholder="Type your answer..."
                    />
                );
            
            case 'textarea':
                return (
                    <textarea
                        className="survey-textarea"
                        value={answer || ''}
                        onChange={(e) => handleAnswer(questionId, e.target.value)}
                        required={question.required}
                        placeholder="Type your detailed answer..."
                        rows={4}
                    />
                );
            
            case 'date':
                return (
                    <input
                        type="date"
                        className="survey-input"
                        value={answer || ''}
                        onChange={(e) => handleAnswer(questionId, e.target.value)}
                        required={question.required}
                    />
                );
            
            case 'time':
                return (
                    <input
                        type="time"
                        className="survey-input"
                        value={answer || ''}
                        onChange={(e) => handleAnswer(questionId, e.target.value)}
                        required={question.required}
                    />
                );
            
            case 'select':
                const selectOptions = Array.isArray(question.options) 
                    ? question.options 
                    : JSON.parse(question.options || '[]');
                    
                return (
                    <div className="choice-options">
                        {selectOptions.map((option, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`choice-btn ${answer === option ? 'active' : ''}`}
                                onClick={() => handleAnswer(questionId, option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );
            
            case 'multiple':
                const multiOptions = Array.isArray(question.options) 
                    ? question.options 
                    : JSON.parse(question.options || '[]');
                    
                const multiAnswer = Array.isArray(answer) ? answer : [];
                
                return (
                    <div className="multiple-options">
                        {multiOptions.map((option, idx) => (
                            <label key={idx} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={multiAnswer.includes(option)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            handleAnswer(questionId, [...multiAnswer, option]);
                                        } else {
                                            handleAnswer(questionId, multiAnswer.filter(v => v !== option));
                                        }
                                    }}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                );
            
            default:
                return <p>Unknown question type: {question.question_type}</p>;
        }
    };

    // Шаг выбора языка
    if (step === 'language') {
        return (
            <div className="language-selection">
                <h2>🌍 Choose Your Language / Выберите язык</h2>
                <p className="language-subtitle">
                    Your questionnaire will be provided in the selected language
                </p>
                
                <div className="language-grid">
                    {languageOptions.map(lang => (
                        <button
                            key={lang.code}
                            className="language-card"
                            onClick={() => selectLanguage(lang)}
                            disabled={loading}
                        >
                            <span className="language-flag">{lang.flag}</span>
                            <span className="language-name">{lang.name}</span>
                        </button>
                    ))}
                </div>
                
                {loading && (
                    <div className="loading-spinner">Loading questionnaire...</div>
                )}
            </div>
        );
    }

    // Шаг анкеты
    if (loading) {
        return <div className="loading-spinner">Loading questions...</div>;
    }

    const totalQuestions = questions.length;
    const requiredQuestions = questions.filter(q => q.required).length;
    const answeredQuestions = Object.keys(answers).length;
    const requiredAnswered = questions.filter(q => q.required && answers[q.id]).length;
    const progress = (answeredQuestions / totalQuestions) * 100;
    const canSubmit = requiredAnswered >= requiredQuestions && answeredQuestions >= 5;

    return (
        <div className="vector-survey">
            <div className="survey-header">
                <div className="selected-language">
                    {selectedLanguage.flag} {selectedLanguage.name}
                </div>
                <button 
                    className="change-language-btn"
                    onClick={() => setStep('language')}
                >
                    Change Language
                </button>
            </div>
            
            <div className="survey-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>{answeredQuestions} / {totalQuestions} questions answered 
                   ({requiredAnswered} / {requiredQuestions} required)</p>
            </div>

            <div className="survey-questions">
                {questions.map((question, idx) => (
                    <div key={question.id} className="question-card">
                        <h4>
                            {idx + 1}. {question.question_text}
                            {question.required && <span className="required-star"> *</span>}
                        </h4>
                        {renderQuestion(question)}
                    </div>
                ))}
            </div>

            <button 
                className="btn-submit" 
                onClick={handleSubmit}
                disabled={!canSubmit}
                title={!canSubmit ? `Please answer at least ${requiredQuestions} required questions` : 'Submit your answers'}
            >
                {canSubmit ? 'Complete Survey ✨' : `Answer ${requiredQuestions - requiredAnswered} more required question(s)`}
            </button>
        </div>
    );
};

export default VectorSurvey;
