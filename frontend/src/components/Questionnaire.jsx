// frontend/src/components/Questionnaire.jsx
import React, { useState } from 'react';

// 接收兩個 props: questions (問題列表) 和 onSubmit (提交處理函式)
const Questionnaire = ({ questions, onSubmit }) => {
  // 1. 儲存問卷的當前回答狀態
  const [answers, setAnswers] = useState(() => {
    // 初始化 answers state，每個問題的初始值為 null (或 '')
    return questions.reduce((acc, question) => {
      acc[question.id] = null; // 預設沒有回答
      return acc;
    }, {});
  });

  // 2. 處理單個問題的回答變更
  const handleChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value,
    }));
  };

  // 3. 檢查所有問題是否都被回答
  const allAnswered = Object.values(answers).every(answer => answer !== null);

  // 4. 處理表單提交
  const handleSubmit = (e) => {
    e.preventDefault(); // 防止表單預設提交動作
    if (allAnswered) {
      onSubmit(answers); // 呼叫父元件傳入的提交處理函式
    } else {
      alert('請回答所有問題後再提交！');
    }
  };

  // 渲染單選按鈕組
  const renderQuestion = (question) => (
    <div key={question.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #333', borderRadius: '8px' }}>
      <h4>{question.text} <span style={{ color: 'red' }}>*</span></h4>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {question.options.map((option, index) => (
          <label key={index} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name={question.id}
              value={option.value}
              checked={answers[question.id] === option.value}
              onChange={() => handleChange(question.id, option.value)}
              style={{ marginRight: '5px' }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="questionnaire-form">
      {questions.map(renderQuestion)}
      <div style={{ marginTop: '30px' }}>
        <button type="submit" disabled={!allAnswered}>
          {allAnswered ? '提交問卷' : '請完成所有問題'}
        </button>
      </div>
    </form>
  );
};

export default Questionnaire;