// /frontend/src/pages/DVQuestionnaire.jsx (主要 DV 測量問卷)

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// 假設這組題目是您的主要 DV，親和力 (Affinity) 和專業度 (Expertise)
const DV_QUESTIONS_BASE = [
    { id: 'dv_affinity', question: '您覺得剛剛與您交談的[PARTNER_LABEL]親和力打幾分？', min: 1, max: 5, type: 'likert' },
    { id: 'dv_expertise', question: '您覺得剛剛與您交談的[PARTNER_LABEL]在議題上的專業度打幾分？', min: 1, max: 5, type: 'likert' },
    // 您可以在這裡添加更多 DV 題目
];

// 圖片路徑
const STIMULUS_MAP = {
    'support': '/trigger_support.png',
    'opposition': '/trigger_opposition.png',
};

export default function DVQuestionnaire() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // 接收上一個頁面傳來的所有數據
    const state = location.state || {};
    const { checkpass, group_s, group_n, group_st, atck1, atck2, mani } = state;
    
    // 儲存 DV 答案
    const [dvAnswers, setDvAnswers] = useState({});

    // ===============================================
    // 🚀 核心邏輯：客製化問卷顯示內容 (根據 n 和 s)
    // ===============================================
    const isHumanPartner = group_n === 1;
    const partnerLabel = isHumanPartner ? '人類夥伴' : 'AI 夥伴'; 
    
    // 根據 s 決定提醒圖片
    let reminderImageSrc = null;
    let reminderText = '';
    
    if (group_s === 0) { // s=0 反方參與者，提醒正方論點
        reminderImageSrc = STIMULUS_MAP['support'];
        reminderText = '請再次回想您剛才看到的**支持**保留博愛座的文章。';
    } else if (group_s === 1) { // s=1 正方參與者，提醒反方論點
        reminderImageSrc = STIMULUS_MAP['opposition'];
        reminderText = '請再次回想您剛才看到的**反對**保留博愛座的文章。';
    }

    // 將 [PARTNER_LABEL] 替換為實際標籤
    const questions = DV_QUESTIONS_BASE.map(q => ({
        ...q,
        question: q.question.replace('[PARTNER_LABEL]', partnerLabel)
    }));
    

    const handleChange = (id, value) => {
        setDvAnswers(prev => ({ ...prev, [id]: parseInt(value) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // 檢查所有 DV 題目是否回答
        const allAnswered = questions.every(q => dvAnswers.hasOwnProperty(q.id));
        if (!allAnswered) {
            alert("請完成所有主要測量題目！");
            return;
        }

        // 導航到人口變項頁面，傳遞所有數據
        navigate('/demographics-page', { 
            state: { 
                ...state, // 傳遞 checkpass, s, n, st, atck, mani
                ...dvAnswers // 傳遞 DV 答案
            } 
        });
    };
    
    // 檢查分組資訊
    if (group_s === undefined) {
        return <div className="page-content">錯誤：無法取得分組資訊。</div>;
    }


    return (
        <div className="page-content">
            <h1>主要因變項測量 (對 {partnerLabel} 的評價)</h1>
            
            {/* 🚀 客製化提醒區塊 (包含圖片) */}
            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
                <p><strong>【回想提示】</strong>{reminderText}</p>
                {reminderImageSrc && (
                    <img 
                        src={reminderImageSrc} 
                        alt="Stimulus Reminder" 
                        style={{ maxWidth: '300px', height: 'auto', marginTop: '10px', border: '1px solid #ccc' }} 
                    />
                )}
            </div>

            <form onSubmit={handleSubmit}>
                {questions.map((q) => (
                    <div key={q.id} style={{ marginBottom: '20px', border: '1px dashed #ddd', padding: '15px' }}>
                        <p><strong>{q.question}</strong></p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            {[...Array(q.max - q.min + 1).keys()].map(i => {
                                const value = q.min + i;
                                return (
                                    <label key={value} style={{ textAlign: 'center' }}>
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={value}
                                            onChange={(e) => handleChange(q.id, e.target.value)}
                                            checked={dvAnswers[q.id] === value}
                                        />
                                        <br/>
                                        {value} 分
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
                
                <button type="submit" style={{ marginTop: '20px' }}>
                    提交主要測量結果
                </button>
            </form>
        </div>
    );
}