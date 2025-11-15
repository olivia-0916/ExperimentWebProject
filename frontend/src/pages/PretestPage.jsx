// /frontend/src/pages/PretestPage.jsx (修正後：中立立場範圍擴展至 3, 4, 5)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';


// ===============================================
// 🎨 全域樣式與顏色常數 
// ===============================================
const PRIMARY_BLUE = '#007bff';
const LIGHT_GRAY = '#f0f0f0';
const DEFAULT_BORDER = '#aaa';
const DARK_TEXT = '#333';


// ===============================================
// 🎯 Firebase 配置與初始化：直接從 import.meta.env 讀取
// ===============================================
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id'; 


// 載入 Firebase SDK，執行初始化、登入，並將服務掛載到 window
const loadFirebaseSDK = async (setAuthReady, setError) => {
    if (window.firebaseDb) {
        setAuthReady(true);
        return;
    }
    
    if (!firebaseConfig.apiKey) {
        setError('Firebase 配置未載入或無效 (缺少 API Key)。請確認 .env 檔案中 VITE_FIREBASE_API_KEY 已正確設置，且開發伺服器已重啟。');
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // 設置為 undefined，強制執行 signInAnonymously
        const initialAuthToken = undefined; 

        if (initialAuthToken) { 
             await signInWithCustomToken(auth, initialAuthToken); 
        } else { 
            await signInAnonymously(auth); 
        }

        window.firebaseApp = app;
        window.firebaseDb = db;
        window.firebaseDoc = doc;
        window.firebaseSetDoc = setDoc;
        window.firebaseGetDoc = getDoc;
        
        window.currentUserId = auth.currentUser?.uid || sessionStorage.getItem('currentUserId') || crypto.randomUUID();
        
        sessionStorage.setItem('currentUserId', window.currentUserId);
        
        setAuthReady(true);
    } catch (e) {
        console.error("Firebase Initialization/Load Error:", e);
        setError(`Firebase 服務初始化失敗。錯誤碼: ${e.code || '未知'}。`);
    }
};


// ===============================================
// 📋 實驗內容與量表定義
// ===============================================

const ST_LIKERT_OPTIONS = [
    { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, 
    { value: 4, label: '4' }, { value: 5, label: '5' }, { value: 6, label: '6' }, { value: 7, label: '7' }
];
const FA_LIKERT_OPTIONS = [
    { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, 
    { value: 4, label: '4' }, { value: 5, label: '5' }, { value: 6, label: '6' }, { value: 7, label: '7' }
];

const ISSUE_CONTENT = {
    title: '博愛座議題的敘述',
    intro: '您將閱讀一段關於博愛座議題的敘述，其中包含支持與反對設立博愛座的論點。請您在閱讀後寫下您對該議題約30~50字的想法。撰寫完想法後，請勾選您對博愛座議題的立場，以及對該議題的熟悉程度。',
    debate: [
        '因近期捷運、公車等交通運輸中頻繁出現讓座糾紛，社會上開始出現「廢除博愛座」的呼聲，常見的兩派觀點如下：',
        '支持保留博愛座者：認為問題在於人心而非座位設置，博愛座象徵社會對弱勢者的支持與關懷。若輕易取消，可能使真正需要幫助者更難獲得保障，即便有人濫用，也不應因此放棄制度。主張保留博愛座可在緊急或有人身體不適時提供固定的安全空間。',
        '主張廢除博愛座者：認為讓座應出自個人品德與同理心，而非制度的強制規範。即使沒有博愛座，民眾仍應主動對弱勢者讓座。主張取消博愛座不會削弱社會善意，反而能減少爭議與道德壓力。',
    ]
};

// ===============================================
// ⚛️ React 組件
// ===============================================

export default function PretestPage() {
    const navigate = useNavigate();
    
    // --- 狀態管理 ---
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [answers, setAnswers] = useState({
        tf1: '',    // 開放式回答 (Text Field)
        st1: null,  // 立場 (Stance)
        fa1: null,  // 熟悉程度 (Familiarity)
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 載入 Firebase
    useEffect(() => {
        loadFirebaseSDK(setIsFirebaseReady, setError);
    }, []);

    // 處理文字輸入變化
    const handleTextChange = (e) => {
        setAnswers(prev => ({ ...prev, tf1: e.target.value }));
        setError(null);
    };

    // 處理李克特量表選擇
    const handleLikertChange = (key, value) => {
        // 確保值是數字類型，而非字串
        const numericValue = parseInt(value);
        setAnswers(prev => ({ ...prev, [key]: numericValue }));
        setError(null);
    };

    // 判斷表單是否通過基本驗證 (用於按鈕啟用)
    const isFormValid = useMemo(() => {
        const { tf1, st1, fa1 } = answers;
        const wordCount = tf1.trim().length;
        
        // 必需所有欄位都有值，且 TF1 字數在 30-50 之間
        const isTf1Valid = wordCount >= 30 && wordCount <= 50;
        const isSt1Valid = st1 !== null;
        const isFa1Valid = fa1 !== null;
        
        return isTf1Valid && isSt1Valid && isFa1Valid;
    }, [answers]);

    // 處理提交
    const handleSubmit = async () => {
        if (!isFormValid) {
             // 提交時的具體錯誤提示
            const { tf1, st1, fa1 } = answers;
            const wordCount = tf1.trim().length;
            if (st1 === null || fa1 === null) {
                setError('請完成所有立場與熟悉度評估。');
            } else if (wordCount < 30) {
                setError(`您的看法字數不足30字 (目前 ${wordCount} 字)。`);
            } else if (wordCount > 50) {
                setError(`您的看法字數超過50字 (目前 ${wordCount} 字)。`);
            } else {
                setError('表單驗證失敗，請檢查所有欄位。');
            }
            return;
        }
        
        if (!isFirebaseReady) {
            setError('Firebase 服務尚未準備好。請稍候重試。');
            return;
        }

        setIsLoading(true);
        setError(null);

        // --- 核心分組邏輯 (已修正) ---
        const answerSt1 = answers.st1;
        let group_s; // 用於記錄受試者立場 (0:反方, 1:正方, 2:中立)
        
        if (answerSt1 <= 2) {
            group_s = 0; // 反方 (分數 1, 2)
        } else if (answerSt1 >= 6) {
            group_s = 1; // 正方 (分數 6, 7)
        } else { // answerSt1 === 3, 4, or 5
            group_s = 2; // 中立
        }

        const userId = window.currentUserId || sessionStorage.getItem('currentUserId');

        if (!window.firebaseDb || !userId) {
            setError("資料儲存失敗：用戶 ID 或資料庫服務遺失。請聯繫研究人員。");
            setIsLoading(false);
            return;
        }

        try {
            // 儲存路徑: artifacts/appId/users/{userId}/experiment_data/pre_test_data
            const docRef = window.firebaseDoc(
                window.firebaseDb, 
                'artifacts', 
                appId, 
                'users', 
                userId, 
                'experiment_data', 
                'pre_test_data'
            );

            const dataToSave = {
                timestamp: new Date().toISOString(),
                q_tf1: answers.tf1,
                q_st1: answers.st1,
                q_fa1: answers.fa1,
                standpoint_s: group_s, // 記錄分組變數 s
            };

            await window.firebaseSetDoc(docRef, dataToSave, { merge: true });
            
            // 延遲確保資料庫寫入同步
            await new Promise(resolve => setTimeout(resolve, 500)); 

            // --- 導航邏輯 ---
            if (group_s === 2) {
                // 中立組：立場分數 3, 4, 5
                navigate('/neutral-end-page', { state: { isNeutral: true } });
            } else { 
                // 實驗組 (s=0 或 s=1)：立場分數 1, 2, 6, 7
                navigate('/stimulus-page'); 
            }

        } catch (err) {
            console.error('Pretest Submission Error:', err);
            setError(`資料儲存至 Firestore 失敗。請截圖並聯繫研究人員！錯誤: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * @description 渲染李克特量表組件
     */
    const renderLikertScale = (key, questionText, options, anchorLeft, anchorRight) => {
        const currentValue = answers[key];
        return (
            <div style={styles.questionBlock}>
                <p style={styles.questionText}>{questionText}</p>
                <div style={styles.likertContainer}>
                    {options.map(option => (
                        <div key={option.value} style={styles.optionGroup}>
                            <input
                                type="radio"
                                id={`${key}-${option.value}`}
                                name={key}
                                value={option.value}
                                checked={currentValue === option.value}
                                onChange={() => handleLikertChange(key, option.value)}
                                style={styles.radioInput}
                            />
                            <label 
                                htmlFor={`${key}-${option.value}`} 
                                style={{
                                    ...styles.radioLabel,
                                    backgroundColor: currentValue === option.value ? styles.selectedColor : styles.defaultColor,
                                    color: currentValue === option.value ? 'white' : styles.DARK_TEXT,
                                    borderColor: currentValue === option.value ? styles.selectedColor : styles.defaultBorder,
                                }}
                            >
                                {option.label} 
                            </label>
                        </div>
                    ))}
                </div>
                
                <div style={styles.anchorRow}>
                    <span style={styles.anchorLeft}>{anchorLeft}</span>
                    <span style={styles.anchorRight}>{anchorRight}</span>
                </div>
            </div>
        );
    };
    
    // 載入畫面
    if (!isFirebaseReady && !error) {
         return (
             <div style={styles.loadingContainer}>
                 {/* 這裡的動畫樣式來自 Tailwind/自定義，與上一個版本不同 */}
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4" style={{borderColor: PRIMARY_BLUE}}></div>
                 <p style={{color: PRIMARY_BLUE}}>正在載入實驗環境與 Firebase 服務...</p>
             </div>
         );
    }
    
    // 錯誤畫面
    if (error && !isFirebaseReady) {
        return (
            <div style={styles.errorContainer}>
                <h1 style={{color: 'white'}}>服務載入失敗</h1>
                <p>{error}</p>
                <p style={{marginTop: '20px'}}>請確保您的 Firebase 專案 ID 和配置已正確設置在環境變數中。</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.mainHeader}>前測問卷</h1>
            
            <p style={styles.description}>
            </p>

            <div style={styles.issueBox}>
                <p style={styles.issueIntro}>{ISSUE_CONTENT.intro}</p>
                {ISSUE_CONTENT.debate.map((p, index) => (
                    <p key={index} style={styles.issueParagraph}>{p}</p>
                ))}
            </div>

            {/* 問題 1: 開放式回答 - 加上題號 1. */}
            <div style={styles.questionBlock}>
                <p style={styles.questionText}>1. 閱讀完上述資訊，請您寫下對博愛座議題的看法（約30-50字）</p>
                <textarea
                    name="tf1"
                    value={answers.tf1}
                    onChange={handleTextChange}
                    style={styles.textArea}
                    rows="4"
                    maxLength="100" 
                />
                <p style={styles.wordCount}>
                    目前字數: {answers.tf1.trim().length} (需 30-50 字)
                </p>
            </div>
            
            {/* 問題 2: 立場 (st1) - 調整問題文字，使用題號 2. */}
            {renderLikertScale(
                'st1',
                '2. 請問您是否支持設立博愛座？ (1:非常不支持, 7:非常支持)',
                ST_LIKERT_OPTIONS,
                '1', 
                '7'
            )}

            {/* 問題 3: 熟悉程度 (fa1) - 調整問題文字，使用題號 3. */}
            {renderLikertScale(
                'fa1',
                '3. 我認為我對博愛座議題： (1:非常不熟悉, 7:非常熟悉)',
                FA_LIKERT_OPTIONS,
                '1', 
                '7'
            )}
            
            {error && <div style={styles.error}>{error}</div>}

            <button 
                onClick={handleSubmit} 
                disabled={!isFormValid || isLoading || !isFirebaseReady} 
                style={isFormValid && !isLoading && isFirebaseReady ? styles.submitButton : styles.disabledButton}
            >
                {isLoading ? '提交中...' : isFirebaseReady ? '提交問卷並進入下一階段' : '載入服務中...'}
            </button>
            
             {window.currentUserId && (
                <div style={styles.userIdDisplay}>
                    用戶 ID: {window.currentUserId} (請記錄此 ID 以便回報問題)
                </div>
            )}
        </div>
    );
}

// ===============================================
// 🎨 樣式定義 (保持不變)
// ===============================================

const styles = {
    selectedColor: PRIMARY_BLUE, 
    defaultColor: 'white',  
    defaultBorder: DEFAULT_BORDER,
    DARK_TEXT: DARK_TEXT,

    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px',
        color: DARK_TEXT, 
        backgroundColor: 'white', 
        minHeight: '100vh',
    },
    mainHeader: {
        textAlign: 'center',
        marginBottom: '10px',
        fontSize: '2em',
        color: DARK_TEXT,
    },
    description: {
        fontSize: '1.05em',
        marginBottom: '30px',
        textAlign: 'center',
    },
    issueBox: {
        backgroundColor: LIGHT_GRAY,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${DEFAULT_BORDER}`,
        marginBottom: '30px',
    },
    issueIntro: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginBottom: '15px',
        lineHeight: '1.6',
    },
    issueParagraph: {
        fontSize: '1em',
        lineHeight: '1.6',
        marginBottom: '10px',
        textAlign: 'justify',
    },
    textArea: {
        width: '100%',
        padding: '10px',
        fontSize: '1em',
        borderRadius: '4px',
        border: `1px solid ${DEFAULT_BORDER}`,
        boxSizing: 'border-box',
        resize: 'vertical',
        marginBottom: '5px',
    },
    wordCount: {
        fontSize: '0.9em',
        color: '#666',
        textAlign: 'right',
        marginBottom: '10px',
    },
    questionBlock: {
        padding: '15px 0',
        borderTop: `1px solid ${LIGHT_GRAY}`,
        marginBottom: '20px',
    },
    questionText: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'left',
    },
    likertContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px', 
        marginBottom: '5px',
        padding: '0 15px', 
    },
    optionGroup: {
        textAlign: 'center',
        flexBasis: 'calc(100% / 7.5)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    radioInput: {
        display: 'none', 
    },
    radioLabel: {
        display: 'block',
        width: '35px',
        height: '35px',
        lineHeight: '35px',
        borderRadius: '50%',
        border: `2px solid`, 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 'bold',
        fontSize: '0.9em',
        textAlign: 'center',
    },
    anchorRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9em',
        color: '#666',
        marginTop: '5px',
        padding: '0 15px',
    },
    anchorLeft: {},
    anchorRight: {},
    error: {
        color: 'red',
        textAlign: 'center',
        marginBottom: '20px',
        fontWeight: 'bold',
        padding: '10px',
        border: '1px solid red',
        backgroundColor: '#ffeeee',
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
    },
    userIdDisplay: {
        marginTop: '20px',
        fontSize: '0.8em',
        color: '#666',
        textAlign: 'center',
        wordBreak: 'break-all',
    },
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    errorContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#d9534f', 
        padding: '30px',
        textAlign: 'center',
    }
};