import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// ===============================================
// 🎯 常數與配置
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const NEUTRAL_GRAY = '#6c757d';

// ===============================================
// 🎯 問題結構定義
// ===============================================

const GENDER_OPTIONS = [
    '男', '女', '非二元', '不願透露', '其他（請註明）',
];

const EDUCATION_OPTIONS = [
    '國小以下', '國中／初中', '高中／高職', '專科／大專', 
    '大學', '碩士', '博士',
];

const DEMOGRAPHICS_QUESTIONS = [
    { 
        id: 'gen', 
        text: '1. 您的生理性別為？', 
        type: 'radio_with_other', 
        options: GENDER_OPTIONS 
    },
    { 
        id: 'edu', 
        text: '2. 您的教育程度為？', 
        type: 'radio', 
        options: EDUCATION_OPTIONS 
    },
    { 
        id: 'age', 
        text: '3. 您的年齡為？', 
        type: 'number_input' 
    },
];

// ===============================================
// 🎯 數據儲存邏輯
// ===============================================

const saveDemographics = async (answers, groups) => {
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
            demographics: {
                timestamp: new Date().toISOString(),
                group_n: groups.groupN, 
                user_stance: groups.userStance,
                content_c: groups.contentC,
                consistency_st: groups.consistencySt,
                checkpass: groups.checkpass, // 儲存 checkpass 狀態
                ...answers,
            }
        }, { merge: true });

        console.log("Demographics Success: Data saved to Firestore.");
    } catch (e) {
        console.error("Save Log Error: Failed to save Demographics data.", e);
    }
};

// ===============================================
// ⚛️ Helper Component: Radio Question 
// ===============================================

const RadioQuestion = ({ question, answer, onSelect }) => {
    const { id, text, options } = question;
    const [otherText, setOtherText] = useState(answer?.other || '');
    
    const hasOtherOption = options.includes('其他（請註明）');

    useEffect(() => {
        if (answer?.value === '其他（請註明）') {
             setOtherText(answer.other || '');
        }
    }, [answer]);


    const handleRadioChange = (value) => {
        if (value !== '其他（請註明）') {
            onSelect(id, { value, other: '' });
        } else {
            onSelect(id, { value, other: otherText });
        }
    };

    const handleOtherChange = (e) => {
        const newText = e.target.value;
        setOtherText(newText);
        if (answer?.value === '其他（請註明）') {
            onSelect(id, { value: '其他（請註明）', other: newText });
        }
    };
    

    return (
        <div style={styles.questionBlock}>
            <h3 style={styles.questionText}>{text}</h3>
            
            <div style={styles.radioGroup}>
                {options
                    .filter(option => option !== '其他（請註明）')
                    .map((option) => (
                    <label key={option} style={styles.radioLabel}>
                        <input
                            type="radio"
                            name={id}
                            value={option}
                            checked={answer?.value === option}
                            onChange={() => handleRadioChange(option)}
                            style={styles.radioInput}
                        />
                        {option}
                    </label>
                ))}

                {hasOtherOption && (
                    <label style={styles.radioLabel}>
                        <input
                            type="radio"
                            name={id}
                            value="其他（請註明）"
                            checked={answer?.value === '其他（請註明）'}
                            onChange={() => handleRadioChange('其他（請註明）')}
                            style={styles.radioInput}
                        />
                        其他（請註明）：
                        <input
                            type="text"
                            value={otherText}
                            onChange={handleOtherChange}
                            style={styles.textInput}
                            disabled={answer?.value !== '其他（請註明）'}
                            placeholder="請填寫"
                        />
                    </label>
                )}
            </div>
        </div>
    );
};

// ===============================================
// ⚛️ Helper Component: Number Input Question
// ===============================================

const NumberInputQuestion = ({ question, answer, onSelect }) => {
    const { id, text } = question;

    const handleNumberChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            onSelect(id, value === '' ? undefined : parseInt(value, 10));
        }
    };

    return (
        <div style={styles.questionBlock}>
            <h3 style={styles.questionText}>{text}</h3>
            <input
                type="number"
                min="1"
                value={answer || ''}
                onChange={handleNumberChange}
                style={styles.numberInput}
                placeholder="請直接填入數字"
            />
        </div>
    );
};


// ===============================================
// ⚛️ Main Component: DemographicsPage
// ===============================================

export default function DemographicsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // 從前一個頁面（Posttest/Check頁面）接收所有組別變數
    const groupN = location.state?.groupN ?? null;
    const userStance = location.state?.userStance ?? null; 
    const contentC = location.state?.contentC ?? null; 
    const consistencySt = location.state?.consistencySt ?? null; 
    const checkpass = location.state?.checkpass ?? 0; // checkpass 預設為 0
    

    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 檢查表單是否填寫完整 (邏輯保持不變)
    const isFormValid = useMemo(() => {
        return DEMOGRAPHICS_QUESTIONS.every(q => {
            const answer = answers[q.id];
            if (answer === undefined) return false;
            
            if (q.type === 'radio' || q.type === 'radio_with_other') {
                if (answer.value === undefined) return false;
                if (answer.value === '其他（請註明）' && (!answer.other || answer.other.trim() === '')) {
                    return false;
                }
            }
            if (q.type === 'number_input') {
                if (typeof answer !== 'number' || answer < 1) return false;
            }
            return true;
        });
    }, [answers]);

    const handleSelect = (id, value) => {
        setAnswers(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        
        // 1. 儲存數據
        const allGroups = { groupN, userStance, contentC, consistencySt, checkpass };
        await saveDemographics(answers, allGroups);
        
        setIsSubmitting(false);

        // 2. ⭐ 導航邏輯與調試檢查
        const targetPath = checkpass === 1 ? '/email-collection-page' : '/complete-page';

        console.log("-----------------------------------------");
        console.log(`Demographics Submission Complete.`);
        console.log(`Checkpass Status Received: ${checkpass}`);
        console.log(`Navigating to: ${targetPath}`);
        console.log("-----------------------------------------");

        // 3. 執行導航，並將組別資訊傳遞給下一個頁面
        navigate(targetPath, { state: allGroups }); 
    };


    return (
        <div style={styles.container}>
            <h1 style={styles.header}>個人資料</h1>
            {/* ⭐ 調試訊息：確認接收到的 checkpass 值 */}
            <p style={{...styles.intro, color: NEUTRAL_GRAY, fontWeight: 'bold'}}>
                （系統檢查：Checkpass={checkpass}）
            </p>
            
            <p style={styles.intro}>
                請填答您的基本人口變項資訊。
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
                
                {DEMOGRAPHICS_QUESTIONS.map((q) => {
                    if (q.type === 'radio' || q.type === 'radio_with_other') {
                        return (
                            <RadioQuestion
                                key={q.id}
                                question={q}
                                answer={answers[q.id]}
                                onSelect={handleSelect}
                            />
                        );
                    } else if (q.type === 'number_input') {
                        return (
                            <NumberInputQuestion
                                key={q.id}
                                question={q}
                                answer={answers[q.id]}
                                onSelect={handleSelect}
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
// 🎨 樣式 (保持不變)
// ===============================================
const styles = {
    container: {
        maxWidth: '800px',
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
        gap: '20px',
    },
    questionBlock: {
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    questionText: {
        fontSize: '1.1em',
        marginBottom: '10px',
        color: '#333',
        fontWeight: 'bold',
    },
    radioGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '1em',
        cursor: 'pointer',
    },
    radioInput: {
        marginRight: '10px',
        accentColor: PRIMARY_BLUE,
    },
    textInput: {
        marginLeft: '5px',
        padding: '5px 10px',
        border: `1px solid ${NEUTRAL_GRAY}`,
        borderRadius: '4px',
        fontSize: '1em',
        flexGrow: 1,
        maxWidth: '200px',
    },
    numberInput: {
        padding: '10px 15px',
        border: `2px solid ${NEUTRAL_GRAY}`,
        borderRadius: '6px',
        fontSize: '1.1em',
        width: '150px',
        marginTop: '5px',
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