// /frontend/src/pages/DiscussionIntroPage.jsx (最終穩定版：修正 Firebase 讀取欄位為 group_s)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; 

// ===============================================
// 🎯 定義主顏色常數
// ===============================================
const PRIMARY_BLUE = '#007bff'; 

// ===============================================
// 🎯 Firebase 讀取 Standpoint S & Group S
// ===============================================
const getExperimentData = async () => {
    if (!window.firebaseDb || !window.currentUserId || !window.appId) {
        return { standpoint_s: null, group_n: null };
    }
    
    try {
        const docRef = doc(
            window.firebaseDb, 
            'artifacts', 
            window.appId, 
            'users', 
            window.currentUserId, 
            'experiment_data', 
            'pre_test_data' // 讀取 pre_test_data
        );
        
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                standpoint_s: data.standpoint_s,
                // ⭐ 關鍵修正：從 pre_test_data 讀取 group_s
                group_n: data.group_s, 
            };
        }
        return { standpoint_s: null, group_n: null }; 
    } catch (e) {
        console.error("DiscussionIntroPage: 讀取實驗數據失敗。", e);
        return { standpoint_s: null, group_n: null };
    }
};


export default function DiscussionIntroPage() {
    const navigate = useNavigate();
    const [userStandpointS, setUserStandpointS] = useState(null); // 用戶立場 S (0, 1, 2)
    const [userGroupN, setUserGroupN] = useState(null);           // 用戶分組 N (0: AI, 1: Human) 
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchExperimentData = async () => {
            const data = await getExperimentData();
            setUserStandpointS(data.standpoint_s);
            setUserGroupN(data.group_n);
            setIsLoading(false);
        };
        fetchExperimentData();
    }, []);


    // ⭐ 導航邏輯：根據 userGroupN 決定導航路徑
    const handleProceed = () => {
        if (userGroupN === 1) {
            // 人類夥伴 (1) -> 導航到匹配動畫頁面
            console.log("Group N = 1 (Human). Navigating to matching animation.");
            navigate('/matching-animation', { 
                state: { 
                    groupN: userGroupN, 
                    userStance: userStandpointS 
                } 
            });
        } else {
            // 機器人夥伴 (0) 或其他情況 -> 直接導航到分配頁
            console.log(`Group N = ${userGroupN} (AI or Unknown). Navigating directly to allocation.`);
            navigate('/discussion-allocation', {
                 state: { 
                    groupN: userGroupN, 
                    userStance: userStandpointS 
                 } 
            }); 
        }
    };

    const getStandpointText = (s) => {
        if (s === 0) return '反方 (不支持)';
        if (s === 1) return '正方 (支持)';
        if (s === 2) return '中立';
        return '未定';
    };
    
    // 顯示分組夥伴類型
    const getPartnerTypeText = (n) => {
        if (n === 1) return '即將與 線上受試者';
        if (n === 0) return '即將與 AI聊天機器人';
        return '載入中...';
    }


    if (isLoading) {
        return <div style={styles.loadingContainer}>正在載入分組資訊...</div>;
    }

    return (
        <div className="page-content" style={styles.container}>
            <h1 style={styles.mainHeader}>討論環節說明</h1>
            
            <div style={styles.infoBox}>
                <p style={styles.instruction}>
                    接下來，系統將隨機為您配對一位參與者。
                    <br/>
                    您{getPartnerTypeText(userGroupN)}，花費 <span style={styles.highlight}>3 分鐘</span> 討論您對博愛座議題的想法。
                </p>

                <p style={styles.warning}>
                    ⚠️ 重要提醒：
                    <br/>
                    系統會記錄對話時長，<span style={styles.boldRed}>未滿 3 分鐘者將無法領取實驗參與獎金</span>。
                </p>
                
                <p style={styles.note}>
                    您的立場分組結果為：{getStandpointText(userStandpointS)}。
                    <br/>
                    (此資訊僅供您參考，請保持理性討論。)
                </p>
            </div>
            
            <button 
                onClick={handleProceed} 
                style={styles.submitButton}
            >
                我已了解，進入討論環節
            </button>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '750px',
        margin: '0 auto',
        padding: '50px 20px',
        textAlign: 'center',
    },
    mainHeader: {
        fontSize: '2em',
        marginBottom: '40px',
        color: '#333',
    },
    infoBox: {
        backgroundColor: '#f8f9fa',
        padding: '30px',
        borderRadius: '10px',
        border: `2px solid ${PRIMARY_BLUE}`,
        marginBottom: '40px',
        textAlign: 'left',
    },
    instruction: {
        fontSize: '1.2em',
        lineHeight: '1.8',
        marginBottom: '20px',
    },
    highlight: {
        color: PRIMARY_BLUE,
        fontWeight: 'bold',
    },
    warning: {
        fontSize: '1.1em',
        lineHeight: '1.6',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeeba',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
    },
    boldRed: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
    note: {
        fontSize: '0.9em',
        color: '#6c757d',
        marginTop: '20px',
        borderTop: '1px solid #dee2e6',
        paddingTop: '15px',
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
    loadingContainer: {
        color: PRIMARY_BLUE,
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.5em',
    }
};