import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// ===============================================
// 🎯 常數與配置
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const NEUTRAL_GRAY = '#6c757d'; 

// ===============================================
// 🎯 動態決定正確答案的核心邏輯 (使用 N 和 ST)
// ===============================================

const getCorrectAnswers = (groupN, consistencySt) => {
    // 1. 議題檢定 (ATCK1) - 始終是博愛座
    const atck1Answer = '博愛座';

    // 2. 夥伴身份檢定 (ATCK2) - 根據 N 變數判斷
    let atck2Answer;
    if (groupN === 0) {
        // N=0: 告知 AI 聊天機器人
        atck2Answer = 'AI'; 
    } else { 
        // N=1: 告知 另一個使用者/匿名參與者
        atck2Answer = '另一個使用者'; 
    }

    // 3. 操弄檢定 (MANI) - 根據 ST 變數判斷 (ST 決定內容 C 的立場)
    let maniAnswer;
    if (consistencySt === 1) {
        // ST=1: 立場一致 (Consistent)
        maniAnswer = '和我一致';
    } else if (consistencySt === 0) {
        // ST=0: 立場不一致 (Inconsistent)
        maniAnswer = '和我不一致';
    } else {
        // ST=2: 雙面 (C=2)
        maniAnswer = '提供雙面訊息（同時提供支持與反對的論點）'; 
    }

    return {
        atck1: atck1Answer,
        atck2: atck2Answer,
        mani: maniAnswer,
    };
};


// 問題定義 (⭐ 修正點 1: 移除內部文字題號)
const QUESTIONS = [
    {
        id: 'atck1',
        text: '您剛才討論的議題是？',
        options: ['博愛座', '核能', '死刑', '免術換證'],
    },
    {
        id: 'atck2',
        text: '剛才與您對話的是？',
        options: ['另一個使用者', 'AI', '剛才沒有進行對話'],
    },
    {
        id: 'mani',
        text: '剛才與對方對話時，對方的立場是？',
        options: ['和我一致', '和我不一致', '提供雙面訊息（同時提供支持與反對的論點）'],
    },
];

// ===============================================
// 🎯 數據儲存邏輯 
// ===============================================

const saveAttentionCheck = async (answers, checkpass, groups) => {
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
            'check_results' 
        );

        await setDoc(docRef, { 
            attention_manipulation_check: {
                timestamp: new Date().toISOString(),
                ...answers,
                checkpass: checkpass, 
                group_n: groups.groupN,
                user_stance: groups.userStance,
                content_c: groups.contentC,
                consistency_st: groups.consistencySt,
            }
        }, { merge: true });

        console.log("Attention Check Success: Data saved to Firestore.");
    } catch (e) {
        console.error("Save Log Error: Failed to save attention check data.", e);
    }
};

// ===============================================
// ⚛️ 組件
// ===============================================

export default function AttentionManipulationCheck() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // 接收所有分組變數
    const groupN = location.state?.groupN;
    const userStance = location.state?.userStance;
    const contentC = location.state?.contentC;
    const consistencySt = location.state?.consistencySt; 

    if (groupN === undefined || consistencySt === undefined) {
        console.warn("WARNING: Missing group variables (N or ST) for attention check. Using null defaults.");
    }

    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isFormValid = useMemo(() => {
        return Object.keys(answers).length === QUESTIONS.length;
    }, [answers]);

    const handleOptionSelect = (questionId, option) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: option,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        
        const correctAnswers = getCorrectAnswers(groupN, consistencySt);

        const isAtck1Correct = answers['atck1'] === correctAnswers['atck1'];
        const isAtck2Correct = answers['atck2'] === correctAnswers['atck2'];
        const isManiCorrect = answers['mani'] === correctAnswers['mani'];

        const calculatedCheckPass = (isAtck1Correct && isAtck2Correct && isManiCorrect) ? 1 : 0;
        
        console.group("ATTENTION CHECK RESULTS (for debugging)");
        console.log(`Group N: ${groupN} | ST: ${consistencySt} | C: ${contentC} | User Stance: ${userStance}`);
        console.log("---");
        console.log("Q1 (議題) - Correct:", correctAnswers['atck1'], " | Your Answer:", answers['atck1'], " | Match:", isAtck1Correct);
        console.log("Q2 (夥伴) - Correct:", correctAnswers['atck2'], " | Your Answer:", answers['atck2'], " | Match:", isAtck2Correct);
        console.log("Q3 (操弄) - Correct:", correctAnswers['mani'], " | Your Answer:", answers['mani'], " | Match:", isManiCorrect);
        console.log("---");
        console.log("Final checkpass:", calculatedCheckPass);
        console.groupEnd();
        
        await saveAttentionCheck(answers, calculatedCheckPass, { groupN, userStance, contentC, consistencySt }); 

        setIsSubmitting(false);
        
        navigate('/posttest-questionnaire', { 
            state: { 
                groupN, 
                userStance, 
                contentC, 
                consistencySt,
                checkpass: calculatedCheckPass 
            } 
        });
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>注意力與操弄檢定</h1>
            <p style={styles.intro}>
                請回想您剛才在討論環節中的對話，並回答以下問題。
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* ⭐ 修正點 2: 使用 index + 1 產生數字題號 */}
                {QUESTIONS.map((q, index) => ( 
                    <div key={q.id} style={styles.questionBlock}>
                        <h3 style={styles.questionText}>
                            {`${index + 1}. ${q.text}`} {/* 數字題號與文本連接 */}
                        </h3>
                        <div style={styles.optionsContainer}>
                            {q.options.map((option, optionIndex) => {
                                const isSelected = answers[q.id] === option;
                                return (
                                    <div
                                        key={optionIndex}
                                        style={{...styles.optionRow, border: isSelected ? `1px solid ${PRIMARY_BLUE}` : '1px solid transparent'}}
                                        onClick={() => handleOptionSelect(q.id, option)}
                                    >
                                        <div style={styles.radioCircle(isSelected)}>
                                            {isSelected && <div style={styles.radioDot} />}
                                        </div>
                                        {option}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                
                <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    style={isFormValid ? styles.submitButton : styles.disabledButton}
                >
                    {isSubmitting ? '正在儲存數據...' : '確認並繼續'}
                </button>
                {!isFormValid && (
                    <p style={styles.warningText}>請回答所有問題才能繼續。</p>
                )}
            </form>
        </div>
    );
}

// ===============================================
// 🎨 樣式
// ===============================================
const styles = {
    container: {
        maxWidth: '700px',
        margin: '50px auto',
        padding: '30px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    header: {
        fontSize: '2em',
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
        gap: '25px',
    },
    questionBlock: {
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    questionText: {
        fontSize: '1.2em',
        marginBottom: '15px',
        color: '#333',
        textAlign: 'left', // ⭐ 修正點 3: 確保靠左對齊
    },
    optionsContainer: {
        display: 'flex',
        flexDirection: 'column', 
        gap: '10px',
    },
    optionRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 15px',
        cursor: 'pointer',
        borderRadius: '5px',
        transition: 'background-color 0.2s',
        fontSize: '1em',
        userSelect: 'none', 
    },
    radioCircle: (isSelected) => ({
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: `2px solid ${isSelected ? PRIMARY_BLUE : '#aaa'}`,
        marginRight: '10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0, 
        transition: 'border-color 0.2s',
    }),
    radioDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: PRIMARY_BLUE,
        transition: 'background-color 0.2s',
    },
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