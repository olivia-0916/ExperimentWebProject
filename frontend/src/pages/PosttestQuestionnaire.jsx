import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// 移除圖片匯入語句，改為直接在 SliderQuestion 中使用靜態路徑字串，以避免編譯錯誤。

// ===============================================
// 🎯 常數與配置
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const NEUTRAL_GRAY = '#6c757d';

// 7點李克特量表選項
const SIMPLIFIED_LIKERT_OPTIONS = [
    { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, 
    { value: 5 }, { value: 6 }, { value: 7 },
];

const LIKERT_TIP = '(1:非常不同意, 7:非常同意)';
const SUPPORT_TIP = '(1:非常不支持, 7:非常支持)';
const CONFIDENCE_TIP = '(1:大幅失去信心, 7:更加有信心)';
const WILLINGNESS_TIP = '(1:非常不願意, 7:非常願意)';


// 夥伴名稱/標籤
const PARTNER_LABEL = {
    'AI': '這個AI',
    'HUMAN': '這名人類使用者', 
};

// ===============================================
// 🎯 問題結構定義 (使用佔位符)
// ===============================================

const BASE_QUESTIONS = [
    // 1. 客觀性 (Objectivity) - obX
    { id: 'ob1', text: `判斷：...會是合理且有邏輯的。 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，我認為{PARTNER_LABEL}的' },
    { id: 'ob2', text: `判斷：...會客觀地考量所有事實。 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，我認為{PARTNER_LABEL}的' },
    { id: 'ob3', text: `判斷：...會基於邏輯分析。 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，我認為{PARTNER_LABEL}的' },
    { id: 'ob4', text: `判斷：...會是理性且客觀的。 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，我認為{PARTNER_LABEL}的' },
    // 2. 專業性 (Expertise) - exX
    { id: 'ex1', text: `大概知道處理該議題的最佳方式 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '{PARTNER_LABEL}' },
    { id: 'ex2', text: `大概比我更了解該議題 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '{PARTNER_LABEL}' },
    { id: 'ex3', text: `大概比我擁有更多關於該議題的知識 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '{PARTNER_LABEL}' },
    // 3. 立場支持度 (Stance) - st2X
    { id: 'st2', text: `在與這個{PARTNER_TYPE}互動後，請問您是否支持設立博愛座？ ${SUPPORT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '' },
    // 4. 信心度 (Confidence) - co1X
    { id: 'co1', text: `在與這個{PARTNER_TYPE}互動後，我對自己在博愛座議題上的立場感到： ${CONFIDENCE_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '' },
    // 5. 情感 (Affect) - ar2X (滑桿) 
    { 
        id: 'ar2', 
        text: '在與這個{PARTNER_TYPE}互動後，請您依照對{PARTNER_LABEL}的感受，填入對應數值。 (0 = 冰冷的, 100 = 溫暖的)', 
        type: 'slider', 
        min: 0, 
        max: 100, 
        step: 1, 
        minLabel: '0 = 冰冷的', 
        maxLabel: '100 = 溫暖的',
        prefix: '' 
    },
];

// 6. 社會距離 (Social Distance) - sd2X
const SOCIAL_DISTANCE_QUESTIONS = [
    { id: 'sd21', text: `假設{OPPONENT_NAME}透過婚姻關係成為我的親戚，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd22', text: `假設{OPPONENT_NAME}會成為我親密的朋友，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd23', text: `假設{OPPONENT_NAME}會成為住在同一條街上的鄰居，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd24', text: `假設{OPPONENT_NAME}會成為我的同事，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd25', text: `假設{OPPONENT_NAME}是我國的公民，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd26', text: `假設{OPPONENT_NAME}是我國的訪客，我可以接受 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'sd27', text: `我不會將{OPPONENT_NAME}排除在我國之外 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
];

// 7. 同理心 (Empathy) - ce2X
const EMPATHY_QUESTIONS = [
    { id: 'ce21', text: `我能理解{OPPONENT_NAME}的觀點 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'ce22', text: `我了解{OPPONENT_NAME}的處境 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'ce23', text: `我能看出{OPPONENT_NAME}在此議題中的思考方式 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
    { id: 'ce24', text: `{OPPONENT_NAME}對此議題的反應是可以理解的 ${LIKERT_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
];

// 8. 互動意願 (Willingness to Interact) - wi1X
const WILLINGNESS_QUESTIONS = [
    { id: 'wi1', text: `假使有機會的話，你是否有意願和{PARTNER_LABEL}繼續互動、彼此交流想法？ ${WILLINGNESS_TIP}`, type: 'likert', options: SIMPLIFIED_LIKERT_OPTIONS, prefix: '在與這個{PARTNER_TYPE}互動後，' },
];


// 根據分組 (groupN) 組合問題集
const QUESTION_SETS = {
    0: {
        partnerType: 'AI', 
        partnerLabel: PARTNER_LABEL.AI, 
        opponentName: PARTNER_LABEL.AI, 
        suffix: 'a', // AI 組後綴
        allQuestions: [
            ...BASE_QUESTIONS,
            ...SOCIAL_DISTANCE_QUESTIONS,
            ...EMPATHY_QUESTIONS,
            ...WILLINGNESS_QUESTIONS,
        ],
    },
    1: {
        partnerType: '人類使用者', 
        partnerLabel: PARTNER_LABEL.HUMAN, 
        opponentName: PARTNER_LABEL.HUMAN, 
        suffix: 'h', // Human 組後綴
        allQuestions: [
            ...BASE_QUESTIONS,
            ...SOCIAL_DISTANCE_QUESTIONS,
            ...EMPATHY_QUESTIONS,
            ...WILLINGNESS_QUESTIONS,
        ],
    },
};

// ===============================================
// 🎯 數據儲存邏輯 
// ===============================================

const saveQuestionnaire = async (answers, groupN) => {
    const userId = window.currentUserId;
    const currentAppId = window.appId;

    if (!window.firebaseDb || !userId) {
        console.error("Save Log Error: Firebase DB or User ID not available.");
        return;
    }

    try {
        const docRef = doc(
            window.firebaseDb, 
            'artifacts', 
            currentAppId, 
            'users', 
            userId, 
            'experiment_data', 
            'dv_questionnaire' 
        );

        await setDoc(docRef, { 
            dv_posttest: {
                timestamp: new Date().toISOString(),
                group_n: groupN,
                ...answers,
            }
        }, { merge: true });

        console.log("DV Questionnaire Success: Data saved to Firestore.");
    } catch (e) {
        console.error("Save Log Error: Failed to save DV questionnaire data.", e);
    }
};

// ===============================================
// ⚛️ Helper Component: Likert Scale Question 
// ===============================================

const LikertQuestion = ({ question, answer, onSelect, questionIndex }) => {
    const { id, text, options } = question;

    return (
        <div style={styles.questionBlock}>
            <h3 style={styles.questionText}>
                <span style={styles.questionNumber}>{questionIndex}. </span>{text}
            </h3>
            
            <div style={styles.optionsContainerHorizontal}> 
                {options.map((option) => {
                    const isSelected = answer === option.value;
                    return (
                        <div
                            key={option.value}
                            style={styles.optionRowHorizontal}
                            onClick={() => onSelect(id, option.value)}
                        >
                            <div style={styles.radioCircle(isSelected)}>
                                {option.value} 
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={styles.likertValueRange}>
                 <span style={styles.likertValueMin}>1</span>
                 <span style={styles.likertValueMax}>7</span>
            </div>
        </div>
    );
};


// ===============================================
// ⚛️ Helper Component: Slider Question (ar2X) ⭐ S 操弄邏輯
// ===============================================

const SliderQuestion = ({ question, answer, onSelect, questionIndex, userStance }) => {
    const { id, text, min, max, step, minLabel, maxLabel } = question;

    let stimulusImageSrc = null; 
    let stimulusTitle = "";
    
    // ⭐ 修正圖片路徑：直接使用靜態字串路徑，確保編譯通過。
    const supportStimulusSrc = '/trigger_support.png';
    const oppositionStimulusSrc = '/trigger_opposition.png';
    
    // 根據 userStance 決定要顯示的刺激物圖片
    if (id === 'ar2' && userStance !== null) {
        // userStance = 0 (反對者) => 顯示正方 (支持) 論述
        if (userStance === 0) {
            stimulusImageSrc = supportStimulusSrc; 
            stimulusTitle = "論述提醒：**正方/支持博愛座**";
        } 
        // userStance = 1 (支持者) => 顯示反方 (反對) 論述
        else if (userStance === 1) {
            stimulusImageSrc = oppositionStimulusSrc;
            stimulusTitle = "論述提醒：**反方/反對博愛座**";
        }
    }


    return (
        <div style={styles.questionBlock}>
            <h3 style={styles.questionText}>
                <span style={styles.questionNumber}>{questionIndex}. </span>{text}
            </h3>

            {/* ⭐ 條件式渲染刺激物圖片 */}
            {stimulusImageSrc && (
                <div style={styles.stimulusContainer}>
                    <p style={styles.stimulusTitle}>{stimulusTitle}</p>
                    <img 
                        src={stimulusImageSrc} 
                        alt="Stimulus Discussion Argument" 
                        style={styles.stimulusImage}
                    />
                </div>
            )}
            
            <div style={styles.sliderValueDisplay}>
                當前選擇: <span style={{ fontWeight: 'bold', color: PRIMARY_BLUE }}>{answer !== undefined ? answer : ((min + max) / 2)}</span>
            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={answer !== undefined ? answer : ((min + max) / 2)} 
                onChange={(e) => onSelect(id, parseInt(e.target.value))}
                style={styles.sliderInput}
            />

            <div style={styles.sliderLabelRange}>
                <span style={styles.sliderLabelMin}>{minLabel}</span>
                <span style={styles.sliderLabelMax}>{maxLabel}</span>
            </div>
        </div>
    );
};


// ===============================================
// ⚛️ Main Component
// ===============================================

export default function PosttestQuestionnaire() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ⭐ 修正點 1：明確提取 checkpass
    const groupN = location.state?.groupN !== undefined ? location.state.groupN : null;
    const userStance = location.state?.userStance !== undefined ? location.state.userStance : null; 
    const checkpass = location.state?.checkpass !== undefined ? location.state.checkpass : 0; // 提取 checkpass

    const currentSet = QUESTION_SETS[groupN] || QUESTION_SETS[0]; 
    const questions = currentSet.allQuestions;

    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isFormValid = useMemo(() => {
        return questions.every(q => answers[q.id + currentSet.suffix] !== undefined);
    }, [answers, questions, currentSet.suffix]);

    const handleSelect = useCallback((baseId, value) => {
        const fullId = baseId + currentSet.suffix;
        setAnswers(prev => ({
            ...prev,
            [fullId]: value,
        }));
    }, [currentSet.suffix]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;
        setIsSubmitting(true);
        await saveQuestionnaire(answers, groupN);
        setIsSubmitting(false);
        
        // ⭐ 修正點 2：導航時，必須將 checkpass 傳遞到下一頁
        navigate('/demographics-page', { 
            state: { 
                groupN: groupN, 
                userStance: userStance,
                checkpass: checkpass // 關鍵修正：將 checkpass 傳遞下去
            } 
        }); 
    };

    const fullHeader = `後測問卷 (與 ${currentSet.partnerLabel} 互動後)`;
    
    // ⭐ 修正點 3: 調整佔位符替換邏輯，處理 PARTNER_TYPE, PARTNER_LABEL, OPPONENT_NAME
    const replacePlaceholders = useCallback((text) => {
        return text
            .replace(/{PARTNER_TYPE}/g, currentSet.partnerType)
            .replace(/{PARTNER_LABEL}/g, currentSet.partnerLabel)
            .replace(/{OPPONENT_NAME}/g, currentSet.opponentName);
    }, [currentSet.partnerType, currentSet.partnerLabel, currentSet.opponentName]);


    return (
        <div style={styles.container}>
            <h1 style={styles.header}>{fullHeader}</h1>
            <p style={styles.intro}>
                請仔細回想與{currentSet.partnerLabel}的互動過程，並根據您的感受填答以下問卷。
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
                
                {questions.map((q, index) => {
                    const fullId = q.id + currentSet.suffix;
                    const questionTextWithPlaceholders = q.prefix ? `${q.prefix} ${q.text}` : q.text;
                    const finalQuestionText = replacePlaceholders(questionTextWithPlaceholders);

                    if (q.type === 'likert') {
                        return (
                            <LikertQuestion
                                key={fullId}
                                question={{ ...q, id: q.id, text: finalQuestionText }}
                                questionIndex={index + 1} 
                                answer={answers[fullId]}
                                onSelect={(id, val) => handleSelect(q.id, val)}
                            />
                        );
                    } else if (q.type === 'slider') {
                         return (
                            <SliderQuestion
                                key={fullId}
                                question={{ ...q, id: q.id, text: finalQuestionText }}
                                questionIndex={index + 1} 
                                answer={answers[fullId]}
                                onSelect={(id, val) => handleSelect(q.id, val)}
                                userStance={userStance} // 傳遞 S 值進行圖片操弄
                            />
                        );
                    }
                    return null;
                })}


                <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    style={isFormValid ? styles.submitButton : styles.disabledButton}
                >
                    {isSubmitting ? '正在儲存數據...' : '確認並進入下一階段'}
                </button>
                {!isFormValid && (
                    <p style={styles.warningText}>請回答所有問題才能繼續。</p>
                )}
            </form>
        </div>
    );
}

// ===============================================
// 🎨 樣式 (修正 questionNumber 與 questionText)
// ===============================================
const styles = {
    container: {
        maxWidth: '900px',
        margin: '50px auto',
        padding: '30px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    header: {
        fontSize: '1.8em',
        color: '#333', 
        borderBottom: `2px solid #333`, 
        paddingBottom: '10px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    intro: {
        fontSize: '1.1em',
        marginBottom: '30px',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
    },
    questionBlock: {
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    questionNumber: { 
        fontWeight: 'bold',
        marginRight: '8px',
        color: '#333', // ⭐ 修正點 1: 題號顏色改為黑色
        fontSize: '1.2em',
    },
    questionText: {
        fontSize: '1.1em',
        marginBottom: '15px',
        color: '#333',
        lineHeight: '1.5',
        textAlign: 'left', // ⭐ 修正點 2: 確保整個題目文本靠左對齊
    },
    
    // 選項容器：水平佈局
    optionsContainerHorizontal: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px',
    },
    // 單個選項行：僅圓圈
    optionRowHorizontal: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1, 
        padding: '5px 5px',
        cursor: 'pointer',
        borderRadius: '5px',
        transition: 'background-color 0.2s',
        userSelect: 'none', 
    },
    // 圓圈樣式：顯示數字
    radioCircle: (isSelected) => ({
        width: '35px', 
        height: '35px',
        borderRadius: '50%',
        border: `2px solid ${isSelected ? PRIMARY_BLUE : NEUTRAL_GRAY}`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0, 
        transition: 'border-color 0.2s, background-color 0.2s',
        backgroundColor: isSelected ? PRIMARY_BLUE : '#fff', 
        color: isSelected ? 'white' : '#333',
        fontWeight: 'bold',
        fontSize: '1.1em',
    }),
    // 數字範圍提示
    likertValueRange: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '1em', 
        color: NEUTRAL_GRAY,
        marginTop: '5px',
        padding: '0 5px',
    },
    likertValueMin: { textAlign: 'left' },
    likertValueMax: { textAlign: 'right' },
    
    // 刺激物圖片區塊樣式
    stimulusContainer: {
        border: `1px solid ${NEUTRAL_GRAY}`,
        borderRadius: '8px',
        padding: '10px',
        margin: '15px auto', 
        maxWidth: '600px', 
        backgroundColor: '#fff',
        textAlign: 'center',
    },
    stimulusTitle: {
        fontWeight: 'bold',
        color: PRIMARY_BLUE,
        marginBottom: '10px',
        fontSize: '1em',
    },
    stimulusImage: {
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '5px',
        border: '1px solid #ddd',
    },
    
    // 滑桿樣式
    sliderInput: {
        width: '100%',
        height: '8px',
        borderRadius: '5px',
        background: '#d3d3d3',
        outline: 'none',
        opacity: '0.7',
        transition: 'opacity 0.2s',
        marginTop: '15px',
        accentColor: PRIMARY_BLUE, 
    },
    sliderLabelRange: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9em',
        color: NEUTRAL_GRAY,
        marginTop: '5px',
    },
    sliderValueDisplay: {
        textAlign: 'center',
        fontSize: '1.2em',
        marginBottom: '10px',
        padding: '5px',
        border: `1px solid ${PRIMARY_BLUE}`,
        borderRadius: '5px',
        backgroundColor: '#e6f2ff',
    },
    // 按鈕樣式
    submitButton: {
        padding: '15px 30px',
        fontSize: '1.2em',
        backgroundColor: PRIMARY_BLUE, 
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginTop: '30px',
        transition: 'background-color 0.3s',
    },
    disabledButton: {
        padding: '15px 30px',
        fontSize: '1.2em',
        backgroundColor: '#ccc',
        color: '#666',
        border: 'none',
        borderRadius: '8px',
        cursor: 'not-allowed',
        fontWeight: 'bold',
        marginTop: '30px',
    },
    warningText: {
        color: WARNING_RED,
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: '10px',
    }
};