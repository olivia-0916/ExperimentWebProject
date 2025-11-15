// /frontend/src/pages/StimulusPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// ===============================================
// 🎯 Firebase 配置與初始化 (略)
// ===============================================
// ... (Firebase initialization code remains the same) ...
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';
window.appId = appId; 

const loadFirebaseSDK = async (setAuthReady, setError) => {
    if (window.firebaseDb) {
        setAuthReady(true);
        return;
    }
    
    if (!firebaseConfig.apiKey) {
        setError('Firebase 配置未載入或無效 (缺少 API Key)。');
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        let currentUserId = sessionStorage.getItem('currentUserId');
        
        await signInAnonymously(auth); 
        
        currentUserId = auth.currentUser?.uid || currentUserId || crypto.randomUUID();
        sessionStorage.setItem('currentUserId', currentUserId);
        
        window.firebaseApp = app;
        window.firebaseDb = db;
        window.currentUserId = currentUserId; 
        
        setAuthReady(true);
    } catch (e) {
        console.error("Firebase Initialization/Load Error:", e.code ? `${e.code}: ${e.message}` : e);
        setError(`Firebase 服務初始化失敗。錯誤碼: ${e.code || '未知'}`);
    }
};

const getStandpointS = async (userId, setError) => {
    const DEFAULT_STANDPOINT = 0; 
    
    try {
        const db = window.firebaseDb;
        const currentAppId = window.appId; 
        
        console.log(`%c[DEBUG: Firestore Read] 正在讀取路徑: artifacts/${currentAppId}/users/${userId}/experiment_data/pre_test_data`, 'color: #1E90FF; font-weight: bold;');
        
        const docRef = doc(db, 'artifacts', currentAppId, 'users', userId, 'experiment_data', 'pre_test_data');
        
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log(`%c[DEBUG: Firestore Read] 成功找到並讀取立場資料 S=${docSnap.data().standpoint_s}`, 'color: #228B22; font-weight: bold;');
            const sValue = docSnap.data().standpoint_s; 
            
            if (sValue === 0 || sValue === 1) {
                 return sValue;
            } else {
                 console.warn(`Firestore 警告：前測立場值 s=${sValue} 無效或為中立 (2)。將使用預設值 ${DEFAULT_STANDPOINT}。`);
                 return DEFAULT_STANDPOINT; 
            }
        } else {
            console.warn(`Firestore 警告：找不到前測立場資料。使用的 UID: ${userId}。當前 App ID: ${currentAppId}。將使用預設值 ${DEFAULT_STANDPOINT}。`);
            return DEFAULT_STANDPOINT; 
        }
    } catch (e) {
        console.error("Firestore 錯誤：讀取立場 S 失敗。", e);
        setError("錯誤：讀取立場 S 失敗。將預設 s=0。"); 
        return DEFAULT_STANDPOINT; 
    }
};


// ===============================================
// 🎯 問題結構定義 (QUESTIONNAIRE_ITEMS)
// ===============================================
const QUESTIONNAIRE_ITEMS = [
    { id: 'sd11', text: '假設＠user67923透過婚姻關係成為我的親戚，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'sd12', text: '假設＠user67923會成為我親密的朋友，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'sd13', text: '假設＠user67923會成為住在同一條街上的鄰居，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'sd14', text: '假設＠user67923會成為我的同事，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'sd15', text: '假設＠user67923會成為我國的公民，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    // sd16：修正文本以匹配您的清單
    { id: 'sd16', text: '假設＠user67923是我國的訪客，我可以接受', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'sd17', text: '我不會將＠user67923排除在我國之外', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    
    // ce 題項
    { id: 'ce11', text: '我能理解＠user67923的觀點', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'ce12', text: '我了解＠user67923的處境', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'ce13', text: '我能看出＠user67923在此議題中的思考方式', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    { id: 'ce14', text: '＠user67923對此議題的反應是可以理解的', type: '7-point', minLabel: '非常不同意', maxLabel: '非常同意' },
    
    // ar1：修正為滑桿並更新說明文字
    { 
        id: 'ar1', 
        text: '請您依照對＠user67923的感受，填入對應數值。', 
        type: 'slider', 
        min: 0, 
        max: 100, 
        step: 1, 
        minLabel: '0 (冰冷的)', 
        maxLabel: '100 (溫暖的)' 
    },
];

const initialQuestionnaireData = QUESTIONNAIRE_ITEMS.reduce((acc, q) => {
    acc[q.id] = null; 
    return acc;
}, {});

// ===============================================
// ⚛️ Helper Component: Radio Scale Question (7-point)
// ===============================================
const RadioScale = ({ id, text, value, onChange, minLabel, maxLabel }) => {
    const options = [1, 2, 3, 4, 5, 6, 7];
    const PRIMARY_BLUE = '#007bff';
    const DEFAULT_BORDER = '#aaa';
    const DARK_TEXT = '#333';

    const handleRadioChange = (e) => {
        onChange(id, parseInt(e.target.value, 10));
    };

    return (
        <div style={styles.questionBlock}>
            <label style={styles.questionText}>{text}</label> 
            
            <div style={styles.likertContainer}>
                {options.map(option => (
                    <div key={option} style={styles.optionGroup}>
                        <input
                            type="radio"
                            id={`${id}-${option}`}
                            name={id}
                            value={option}
                            checked={value === option}
                            onChange={handleRadioChange}
                            style={{ display: 'none' }} 
                        />
                        <label 
                            htmlFor={`${id}-${option}`} 
                            style={{
                                ...styles.radioLabel,
                                backgroundColor: value === option ? PRIMARY_BLUE : styles.defaultColor,
                                color: value === option ? 'white' : DARK_TEXT,
                                borderColor: value === option ? PRIMARY_BLUE : styles.defaultBorder,
                            }}
                        >
                            {option}
                        </label>
                    </div>
                ))}
            </div>
            
            <div style={styles.anchorRow}>
                <span style={styles.anchorLeft}>{minLabel}</span>
                <span style={styles.anchorRight}>{maxLabel}</span>
            </div>
        </div>
    );
};


// ===============================================
// ⚛️ Helper Component: Slider Scale Question (ar1)
// ===============================================
const SliderScale = ({ id, text, value, onChange, min, max, step, minLabel, maxLabel }) => {
    const PRIMARY_BLUE = '#007bff';
    const defaultValue = Math.round((min + max) / 2); // 中點值作為未選擇時的顯示值
    const currentValue = value !== null ? value : defaultValue;
    
    // 確保 onChange 傳遞數字
    const handleSliderChange = (e) => {
        onChange(id, parseInt(e.target.value, 10));
    };

    return (
        <div style={styles.questionBlock}>
            <label style={styles.questionText}>{text}</label> 
            
            {/* 顯示當前滑桿數值 */}
            <div style={styles.sliderValueDisplay}>
                當前選擇: <span style={{ fontWeight: 'bold', color: PRIMARY_BLUE }}>{currentValue}</span>
            </div>

            {/* 滑桿輸入框 */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={handleSliderChange}
                // 使用樣式中的 sliderInput
                style={styles.sliderInput} 
            />

            {/* 範圍標籤 */}
            <div style={styles.anchorRow}>
                <span style={styles.anchorLeft}>{minLabel}</span>
                <span style={styles.anchorRight}>{maxLabel}</span>
            </div>
        </div>
    );
};


// ===============================================
// 🎯 主頁面組件
// ===============================================
const StimulusPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); 
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false); 
    const [questionnaireData, setQuestionnaireData] = useState(initialQuestionnaireData);
    const [participantStandpointS, setParticipantStandpointS] = useState(null); 
    const [imageLoadError, setImageLoadError] = useState(false); 

    const stimulusInfo = useMemo(() => {
        const s = participantStandpointS === null || participantStandpointS === 2 ? 0 : participantStandpointS; 
        const stimulusS = s === 0 ? 1 : 0; 
        const text = stimulusS === 1 ? '支持保留博愛座' : '反對保留博愛座';
        const path = stimulusS === 1 ? 'trigger_support.png' : 'trigger_opposition.png'; 
        return { text, path, stimulusS };
    }, [participantStandpointS]);

    useEffect(() => {
        console.log(`%c[DEBUG: Init] 頁面開始載入。AppID: ${window.appId}, Session UID: ${sessionStorage.getItem('currentUserId')}`, 'color: #FFA500;');
        
        loadFirebaseSDK(setIsFirebaseReady, setError)
            .then(async () => {
                await new Promise(resolve => setTimeout(resolve, 100)); 

                if (window.currentUserId) {
                    const s = await getStandpointS(window.currentUserId, setError);
                    setParticipantStandpointS(s);
                } else {
                    console.error("[DEBUG: Init] loadFirebaseSDK 失敗，未取得有效的 window.currentUserId。");
                    setParticipantStandpointS(0); 
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const isFormComplete = useMemo(() => {
        return QUESTIONNAIRE_ITEMS.every(q => questionnaireData[q.id] !== null);
    }, [questionnaireData]);


    const handleSubmitAndContinue = async () => {
        if (!isFormComplete) {
            setError("請回答所有問卷題目後再提交。");
            return;
        }
        
        if (loading || hasCompleted || !isFirebaseReady || participantStandpointS === null) {
            setError("資料未完全載入或已提交，請稍候。");
            return;
        }

        const db = window.firebaseDb;
        const userId = window.currentUserId;
        const currentAppId = window.appId; 
        
        if (!db || !userId) {
            setError("Firebase 資料庫未準備好或用戶未登入。");
            return;
        }

        setLoading(true);
        setError(null);

        const dataToSave = {
            ...questionnaireData,
            participant_s: participantStandpointS,
            stimulus_s: stimulusInfo.stimulusS,
            timestamp: new Date().toISOString(),
        };

        try {
            const docRef = doc(db, 'artifacts', currentAppId, 'users', userId, 'experiment_data', 'post_stimulus_data');
            await setDoc(docRef, dataToSave, { merge: true });
            
            console.log("StimulusPage: Post-stimulus data successfully saved to Firestore.");

            setHasCompleted(true);
            navigate('/discussion-intro');

        } catch (e) {
            console.error("StimulusPage: Error saving data:", e);
            setError(`數據提交失敗：${e.message || '請檢查網路或聯繫研究人員。'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (id, value) => {
        setQuestionnaireData(prev => ({
            ...prev,
            [id]: value
        }));
    };
    
    if (loading || participantStandpointS === null) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                    <div style={{ borderRadius: '9999px', height: '40px', width: '40px', borderBottom: '2px solid white', margin: '0 auto', marginBottom: '14px', animation: 'spin 1s linear infinite' }}></div>
                    <p>正在載入實驗環境與分組資訊...</p>
                </div>
            </div>
        );
    }

    let currentQuestionIndex = 1;

    const renderQuestionnaire = (sectionPrefix, title) => {
        const sectionItems = QUESTIONNAIRE_ITEMS.filter(q => q.id.startsWith(sectionPrefix));
        
        const elements = (
            <div style={styles.questionnaireSection}>
                <h4 style={styles.questionnaireTitle}>{title}</h4>
                {sectionItems.map(q => {
                    const sequentialNumber = currentQuestionIndex++; 
                    const questionProps = {
                        key: q.id,
                        id: q.id,
                        text: `${sequentialNumber}. ${q.text}`, 
                        value: questionnaireData[q.id],
                        onChange: handleInputChange,
                        minLabel: q.minLabel,
                        maxLabel: q.maxLabel,
                    };
                    
                    if (q.type === '7-point') {
                        return <RadioScale {...questionProps} />;
                    } else if (q.type === 'slider') {
                        return (
                             <SliderScale 
                                {...questionProps}
                                min={q.min}
                                max={q.max}
                                step={q.step}
                             />
                        );
                    }
                    return null;
                })}
            </div>
        );
        
        return elements;
    };
    
    // 確保 renderQuestionnaire 呼叫順序與您清單一致：sd -> ar -> ce (注意，在代碼中 ar 在最後)
    // 根據您提供的清單順序：sd11-sd17 -> ar1 -> ce11-ce14
    // 原始代碼的 render 順序是：sd -> ce -> ar。我將修改 render 順序以匹配您的清單。

    // 為了匹配您的清單順序：sd11-sd17 -> ar1 -> ce11-ce14
    // 由於我們是依據 sectionPrefix 來 render，我們只需要調整 render 的順序即可。

    return (
        <div style={styles.container}>
            <div style={styles.contentBox}>
                <h1 style={styles.mainHeader}>
                    刺激物觀看與問卷
                </h1>
                
                <div style={styles.stimulusBox}>
                    <h2 style={styles.stimulusHeader}>
                        您被分配觀看的論點：**{stimulusInfo.text}**
                    </h2>
                    <p style={styles.stimulusIntro}>以下是某位社群平台使用者對博愛座議題的敘述，請您閱讀後勾選以下題項。</p>

                    <div style={styles.imageContainer}>
                        {imageLoadError ? (
                            <div style={styles.imageError}>
                                無法載入圖片: {stimulusInfo.path}。請確認檔案是否存在於 /public 資料夾。
                            </div>
                        ) : (
                            <img 
                                src={`/${stimulusInfo.path}`} 
                                alt={`刺激物: ${stimulusInfo.text} 論述`}
                                style={styles.stimulusImage}
                                onError={() => setImageLoadError(true)} 
                            />
                        )}
                    </div>
                     <p style={styles.imageCaption}>請仔細閱讀上方內容，完成後繼續填答。</p>
                </div>

                <div style={styles.questionnaireOverall}>
                    <h3 style={styles.subHeader}>問卷題項 (共 12 題)</h3>
                    
                    {/* 依照您的題目清單順序調整：sd -> ar -> ce */}
                    {renderQuestionnaire('sd', '與＠user67923的接受度 (第 1-7 題)')}
                    {renderQuestionnaire('ar', '與＠user67923的情感反應 (第 8 題)')} {/* 7 (sd) + 1 = 8 題 */}
                    {renderQuestionnaire('ce', '共情與理解 (第 9-12 題)')} {/* 8 + 4 = 12 題 */}
                </div>
                
                {error && (
                    <div style={styles.error}>
                        <span style={{ display: 'block', sm: 'inline' }}>錯誤：{error}</span>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>請截圖聯繫研究人員。</p>
                    </div>
                )}
                
                <button
                    onClick={handleSubmitAndContinue}
                    disabled={loading || hasCompleted || !isFirebaseReady || participantStandpointS === null || !isFormComplete}
                    style={isFormComplete && !loading && isFirebaseReady && participantStandpointS !== null ? styles.submitButton : styles.disabledButton}
                >
                    {loading ? '正在處理數據...' : isFormComplete ? '提交問卷，進入下一階段' : '請完成所有題目'}
                </button>
                
                {hasCompleted && (
                     <p style={{ textAlign: 'center', color: '#10B981', fontWeight: '500', marginTop: '1rem' }}>數據已成功儲存，正在導航...</p>
                )}
            </div>
        </div>
    );
};

export default StimulusPage;


// 樣式定義 (保持與上次相同，但補充了 Slider 相關的 styles)
const PRIMARY_BLUE = '#007bff';
const LIGHT_GRAY = '#f0f0f0';
const DEFAULT_BORDER = '#aaa';
const DARK_TEXT = '#333';

const styles = {
    defaultColor: 'white', 
    defaultBorder: DEFAULT_BORDER,

    container: {
        minHeight: '100vh',
        backgroundColor: LIGHT_GRAY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        padding: '1rem',
    },
    contentBox: {
        backgroundColor: 'white',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderRadius: '0.75rem', 
        padding: '2rem', 
        maxWidth: '48rem', 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem', 
        marginTop: '2.5rem', 
        marginBottom: '2.5rem', 
    },
    mainHeader: {
        textAlign: 'center',
        fontSize: '1.875rem', 
        fontWeight: '800', 
        borderBottom: '1px solid #e5e7eb', 
        paddingBottom: '1rem', 
    },
    stimulusBox: {
        border: '1px solid #93C5FD', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        backgroundColor: '#EEF2FF', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', 
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem', 
    },
    stimulusHeader: {
        fontSize: '1.5rem', 
        fontWeight: 'bold',
        color: '#374151', 
        textAlign: 'center',
    },
    stimulusIntro: {
        color: '#4B5563', 
        textAlign: 'center',
    },
    imageContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem', 
        backgroundColor: 'white',
        borderRadius: '0.5rem', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.05)', 
    },
    stimulusImage: {
        width: '100%', 
        maxWidth: '100%', 
        height: 'auto', 
        objectFit: 'contain',
        borderRadius: '0.5rem', 
        border: '1px solid #e5e7eb', 
    },
    imageError: {
        color: '#DC2626', 
        padding: '1rem',
        border: '1px solid #FCA5A5', 
        backgroundColor: '#FEF2F2', 
        borderRadius: '0.5rem',
        textAlign: 'center',
        width: '100%',
        maxWidth: '32rem', 
    },
    imageCaption: {
        fontSize: '0.875rem', 
        color: '#6B7280', 
        textAlign: 'center',
    },
    questionnaireOverall: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem', 
    },
    subHeader: {
        fontSize: '1.25rem', 
        fontWeight: 'bold',
        borderBottom: '1px solid #e5e7eb', 
        paddingBottom: '0.5rem', 
        color: '#374151', 
    },
    questionnaireSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem', 
        paddingTop: '1rem', 
        borderTop: '1px solid #e5e7eb', 
    },
    questionnaireTitle: {
        fontSize: '1.125rem', 
        fontWeight: '600', 
        color: '#4B5563', 
    },
    questionBlock: {
        padding: '15px 0', 
        borderTop: `1px solid #f0f0f0`,
        marginBottom: '10px', 
        width: '100%', 
    },
    questionText: {
        fontSize: '1em', 
        fontWeight: 'bold',
        marginBottom: '15px', 
        display: 'block', 
        width: '100%',
        textAlign: 'left',
        color: DARK_TEXT,
    },
    // Likert 樣式
    likertContainer: {
        display: 'flex',
        justifyContent: 'flex-start', 
        gap: '10px', 
        marginBottom: '15px',
        padding: '0', 
    },
    optionGroup: {
        textAlign: 'center',
        flexBasis: 'calc(100% / 7)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    radioLabel: {
        display: 'block',
        width: '35px',
        height: '35px',
        lineHeight: '35px',
        borderRadius: '50%',
        border: `2px solid ${DEFAULT_BORDER}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 'bold',
        fontSize: '1em',
        textAlign: 'center',
    },
    // 通用範圍標籤 (適用於 Likert 和 Slider)
    anchorRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9em',
        color: '#666',
        marginTop: '5px',
        padding: '0',
    },
    anchorLeft: {
        textAlign: 'left',
        fontWeight: 'normal',
        width: 'auto', 
        paddingRight: '0.5rem',
    },
    anchorRight: {
        textAlign: 'right',
        fontWeight: 'normal',
        width: 'auto', 
        paddingLeft: '0.5rem',
    },
    // 滑桿專用樣式
    sliderValueDisplay: {
        textAlign: 'center',
        fontSize: '1.2em',
        marginBottom: '10px',
        padding: '5px',
        border: `1px solid ${PRIMARY_BLUE}`,
        borderRadius: '5px',
        backgroundColor: '#e6f2ff',
    },
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
    // 錯誤和按鈕樣式
    error: {
        color: 'red',
        textAlign: 'center',
        marginBottom: '20px',
        fontWeight: 'bold',
        padding: '10px',
        border: '1px solid red',
        backgroundColor: '#fdd',
    },
    submitButton: {
        width: '100%',
        padding: '15px 20px',
        fontSize: '1.2em',
        backgroundColor: PRIMARY_BLUE, 
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        fontWeight: 'bold',
    },
    disabledButton: {
        width: '100%',
        padding: '15px 20px',
        fontSize: '1.2em',
        backgroundColor: '#ccc', 
        color: '#666',
        border: 'none',
        borderRadius: '5px',
        cursor: 'not-allowed',
        fontWeight: 'bold',
    }
};