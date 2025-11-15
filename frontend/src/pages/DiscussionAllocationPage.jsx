// /frontend/src/pages/DiscussionAllocationPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// ===============================================
// 🎯 常數與配置
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const ANONYMOUS_ID = 837;

// ===============================================
// 🎯 核心函數：分配 N (夥伴類型) 和 C (夥伴內容立場)
// ===============================================
const allocateGroup = () => {
    // N (夥伴類型): 0 = AI, 1 = Human/Anonymous (假設平均分配)
    const groupN = Math.random() < 0.5 ? 0 : 1; 

    // C (夥伴內容立場): 0 = 反對博愛座 (Oppose), 1 = 支持博愛座 (Support) (假設平均分配)
    const contentC = Math.random() < 0.5 ? 0 : 1;
    
    // S (使用者立場): 這裡假設從 Pre-test (或某處狀態) 獲得，這裡暫時隨機分配
    // ⚠️ 實際實驗中 S 值應來自 Pre-test/Stance 測量！
    const userStance = Math.random() < 0.5 ? 0 : 1; 

    // ST (Consistency - N/A in allocation): 假設為 0 (不一致) 或 1 (一致)
    // ST 通常在後端根據 S 和 C 的關係計算，這裡暫時給予一個預設值，前端頁面不需要顯示
    const consistencySt = (userStance === contentC) ? 1 : 0; 

    return { groupN, contentC, userStance, consistencySt };
};


// ===============================================
// 🎯 數據儲存邏輯：儲存 N, C, S, ST
// ===============================================

const saveAllocation = async (data) => {
    const userId = window.currentUserId;
    const currentAppId = window.appId;

    if (!window.firebaseDb || !userId) {
        console.error("Save Log Error: Firebase DB or User ID not available.");
        return false;
    }

    try {
        const docRef = doc(
            window.firebaseDb, 
            'artifacts', 
            currentAppId, 
            'users', 
            userId, 
            'experiment_data', 
            'allocation' 
        );

        await setDoc(docRef, { 
            allocation: {
                timestamp: new Date().toISOString(),
                group_n: data.groupN,          // N: 夥伴類型 (0=AI, 1=Human)
                content_c: data.contentC,      // C: 夥伴立場 (0=Oppose, 1=Support)
                user_stance: data.userStance,  // S: 使用者立場
                consistency_st: data.consistencySt, // ST: 立場一致性
            }
        }, { merge: true });

        console.log("Allocation Success: Data saved to Firestore.");
        return true;
    } catch (e) {
        console.error("Save Log Error: Failed to save allocation data.", e);
        return false;
    }
};

// ===============================================
// ⚛️ 組件
// ===============================================

export default function DiscussionAllocationPage() {
    const navigate = useNavigate();
    
    const [allocation, setAllocation] = useState(null); // 儲存分配結果 { groupN, contentC, userStance, consistencySt }
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);


    // 1. 頁面加載時分配組別並儲存
    useEffect(() => {
        if (allocation !== null || isSaving) return;

        setIsSaving(true);
        const allocatedData = allocateGroup(); // 執行分配
        
        saveAllocation(allocatedData).then(success => {
            if (success) {
                setAllocation(allocatedData);
                console.log(`Allocated: N=${allocatedData.groupN}, C=${allocatedData.contentC}`);
            } else {
                console.error("Critical Error: Failed to save allocation. Check Firebase setup.");
            }
            setIsSaving(false);
            setIsLoading(false);
        });

    }, [allocation, isSaving]);


    const handleContinue = () => {
        if (!allocation) return;
        
        // 2. 導航到討論頁面，並傳遞所有關鍵變數
        navigate('/discussion-page', { 
            state: { 
                groupN: allocation.groupN, 
                userStance: allocation.userStance,
                contentC: allocation.contentC,
                consistencySt: allocation.consistencySt,
            } 
        });
    };

    // 根據 N 和 C 變數決定顯示內容
    const partnerType = allocation?.groupN === 0 
        ? 'AI 聊天機器人' 
        : `線上受試者`;
        
    const partnerStance = allocation?.contentC === 0 
        ? '反對博愛座' 
        : '支持博愛座';
    
    const partnerLabel = allocation?.groupN === 0 ? 'AI' : 'Chen Yuan（此名稱經本實驗隨機匿名化處理）';


    if (isLoading || isSaving) {
        // ⭐ 等待分配和儲存時的畫面
        return (
            <div style={styles.container}>
                <h1 style={styles.header}>討論夥伴分配結果</h1>
                <div style={styles.box}>
                    <h2 style={{color: PRIMARY_BLUE}}>正在分配討論對象...</h2>
                    <p>系統正在為您配對並確認實驗組別。</p>
                    <p style={styles.warningText}>請耐心等候幾秒鐘。</p>
                    <button style={styles.disabledButton} disabled>我已了解，進入討論環節</button>
                </div>
            </div>
        );
    }
    
    // ⭐ 顯示分配結果 (已成功儲存並獲取 allocation)
    return (
        <div style={styles.container}>
            <h1 style={styles.header}>討論夥伴分配結果</h1>
            <div style={styles.box}>
                {/* 顯示角色 */}
                <h2 style={{color: PRIMARY_BLUE, marginBottom: '20px'}}>您的討論對象是：{partnerType}</h2>
                
                {/* 顯示立場 */}
                <div style={styles.resultDetails}>
                    <p style={styles.detailItem}>您的夥伴是：{partnerLabel}</p>
                    <p style={styles.detailItem}>其對博愛座議題的立場是：{partnerStance}</p>
                </div>
                
                <p style={styles.instruction}>請您和對方討論您對博愛座議題的想法。</p>
                <p style={styles.warningText}>重要提醒：系統會記錄對話時長，未滿 3 分鐘者將無法領取實驗參與與獎金。</p>
                
                <button 
                    onClick={handleContinue} 
                    style={styles.submitButton}
                >
                    我已了解，進入討論環節
                </button>
            </div>
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
        textAlign: 'center',
    },
    header: {
        fontSize: '1.8em',
        color: PRIMARY_BLUE, 
        borderBottom: `2px solid ${PRIMARY_BLUE}`, 
        paddingBottom: '10px',
        marginBottom: '40px',
    },
    box: {
        padding: '30px',
        border: `1px solid ${PRIMARY_BLUE}`,
        borderRadius: '10px',
        backgroundColor: '#e6f2ff',
    },
    resultDetails: {
        textAlign: 'left',
        margin: '20px auto',
        maxWidth: '80%',
        padding: '15px',
        border: '1px dashed #aaa',
        backgroundColor: '#f9f9f9',
        borderRadius: '5px',
    },
    detailItem: {
        fontSize: '1.1em',
        lineHeight: '1.6',
        margin: '5px 0',
        fontWeight: 'bold',
    },
    instruction: {
        marginTop: '30px',
        fontSize: '1.05em',
        fontWeight: '500',
    },
    warningText: {
        color: WARNING_RED,
        marginTop: '20px',
        marginBottom: '30px',
        fontWeight: 'bold',
    },
    submitButton: {
        padding: '12px 25px',
        fontSize: '1.1em',
        backgroundColor: PRIMARY_BLUE, 
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
    },
    disabledButton: {
        padding: '12px 25px',
        fontSize: '1.1em',
        backgroundColor: '#ccc',
        color: '#666',
        border: 'none',
        borderRadius: '6px',
        cursor: 'not-allowed',
        fontWeight: 'bold',
    },
};