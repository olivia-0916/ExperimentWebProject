// /frontend/src/pages/ExperimentPage.jsx (連線動畫 + 分組邏輯修正版)

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// 定義隨機分組 c 的範圍 (0, 1, 2)
const MAX_RANDOM_C = 2;

const API_BASE_URL = ''; 
const RANDOMIZE_GROUP_ENDPOINT = '/api/randomize_group'; // 假設後端有一個 API 來儲存分組結果

export default function ExperimentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // 從 StimulusPage (或 PretestPage) 接收 s 分組 (0:反方, 1:正方)
    const group_s = location.state?.group_s; 

    // 狀態
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [random_c, setRandom_c] = useState(null);
    const [finalGroup, setFinalGroup] = useState(null); // 儲存最終分組 st, c, n
    
    // 🎯 連線動畫狀態 (新增)
    const [showConnecting, setShowConnecting] = useState(false); 
    const [connectionTime, setConnectionTime] = useState(5); 

    // ===============================================
    // 🎯 Step 3: 計算最終分組 st (觀點) 和 n (角色)
    // ===============================================
    const calculateFinalGroups = (s, c) => {
        let group_st; // AI/夥伴的觀點 (0:反, 1:正, 2:雙面/中立)
        let group_n;  // AI/夥伴的角色 (0:AI, 1:人)

        // 決定 st (觀點)
        if (c === 1) { // c=1: 不一致組。st 必須與 s 相反
            group_st = (s === 0) ? 1 : 0; 
        } else if (c === 0) { // c=0: 一致組。st 必須與 s 相同
            group_st = s; 
        } else { // c === 2: 雙面/中立組。st 固定為 2
            group_st = 2;
        }

        // 決定 n (角色)
        // 根據設計圖，c=0 和 c=2 歸類給 n=0 (AI)；c=1 歸類給 n=1 (人)
        group_n = (c === 1) ? 1 : 0; 

        return { group_st, group_n };
    };


    // 🎯 核心邏輯：隨機分組 c, 計算 st/n，並處理導航 (Step 1, 2, 3)
    const fetchRandomizationAndNavigate = useCallback(async () => {
        if (group_s === undefined) {
             setError('錯誤：未能取得前測立場分組資訊。');
             setIsLoading(false);
             return;
        }

        setIsLoading(true);
        
        // 1. 隨機分組 c (0, 1, 2)
        const c = Math.floor(Math.random() * (MAX_RANDOM_C + 1)); // 0, 1, or 2
        setRandom_c(c);

        // 2. 計算最終分組 st 和 n
        const { group_st, group_n } = calculateFinalGroups(group_s, c);
        setFinalGroup({ st: group_st, c: c, n: group_n });
        
        // 🎯 模擬後端儲存分組結果 (如果需要)
        try {
            await axios.post(`${API_BASE_URL}${RANDOMIZE_GROUP_ENDPOINT}`, { 
                group_s, 
                group_c: c, 
                group_st, 
                group_n 
            });
            console.log("Randomization saved:", { group_s, c, group_st, group_n });
        } catch (err) {
            console.warn("WARN: 無法儲存分組結果到後端，但繼續實驗流程。", err);
        }

        // 3. 處理導航
        if (group_n === 1) {
            // 🎯 n=1 (人類對象): 顯示連線動畫
            setIsLoading(false); 
            setShowConnecting(true); 
            
            // 模擬 5 秒連線延遲
            let timer = 5;
            const interval = setInterval(() => {
                timer -= 1;
                setConnectionTime(timer);
                if (timer <= 0) {
                    clearInterval(interval);
                    // 連線成功，導航到聊天頁面
                    navigate('/posttest-page', { state: { group_s, group_st, group_n } });
                }
            }, 1000);

            // 清理函數以防組件卸載
            return () => clearInterval(interval);

        } else {
            // n=0 (AI 機器人): 直接進入聊天頁面
            navigate('/posttest-page', { state: { group_s, group_st, group_n } });
        }
        
    }, [group_s, navigate]);

    useEffect(() => {
        // 確保只執行一次隨機分組
        if (random_c === null) {
            fetchRandomizationAndNavigate();
        }
    }, [random_c, fetchRandomizationAndNavigate]);


    if (error) {
        return <div style={styles.errorContainer}><h2>錯誤</h2><p>{error}</p></div>;
    }

    // 初始載入中 (在隨機分組尚未完成時)
    if (isLoading) {
        return <div style={styles.loadingContainer}><h2>正在進行隨機分組...</h2><p>請稍候</p></div>;
    }

    // 🎯 顯示連線動畫畫面 (僅限 n=1)
    if (showConnecting) {
        return (
            <div className="page-content" style={{ ...styles.container, ...styles.centerContent }}>
                <div style={styles.connectingBox}>
                    <div style={styles.spinner}></div>
                    <h1 style={styles.connectingTitle}>正在連線匿名聊天對象 ...</h1>
                    <p style={styles.connectingText}>請勿關閉或重新整理網頁。將在 {connectionTime} 秒後進入討論。</p>
                </div>
                {/* Debug Info */}
                <div style={styles.debugBox}>
                    <p>除錯資訊 (開發階段用):</p>
                    <p>參與者立場分組 (s): {group_s === 0 ? '反方' : '正方'}</p>
                    <p>隨機組別 (c): {finalGroup?.c} ({finalGroup?.c === 0 ? '一致' : (finalGroup?.c === 1 ? '不一致' : '雙面')})</p>
                    <p>角色分組 (n): {finalGroup?.n} ({finalGroup?.n === 0 ? 'AI 機器人' : '人類'})</p>
                </div>
            </div>
        );
    }
    
    // 如果執行到這裡，表示分組完成但可能導航出錯
    return <div className="page-content" style={styles.container}>分組成功，正在導航...</div>;
}


// 樣式定義 (確保白色背景)
const styles = {
    container: {
        maxWidth: '850px',
        margin: '0 auto',
        padding: '30px 20px',
        color: 'black', 
        backgroundColor: 'white', // 🎯 確保背景為白色
        minHeight: '100vh',
    },
    centerContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        height: 'calc(100vh - 60px)', // 減去 padding 保持置中
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '50px',
        color: 'black',
        backgroundColor: 'white',
        minHeight: '100vh',
    },
    errorContainer: {
        textAlign: 'center',
        padding: '50px',
        color: 'red',
        backgroundColor: 'white',
        minHeight: '100vh',
    },
    connectingBox: {
        padding: '40px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#f9f9f9',
        marginBottom: '30px',
    },
    connectingTitle: {
        color: '#007bff',
        marginTop: '20px',
    },
    connectingText: {
        fontSize: '1.1em',
        color: '#555',
        marginTop: '15px',
    },
    spinner: {
        border: '6px solid #f3f3f3',
        borderTop: '6px solid #007bff',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        animation: 'spin 1.5s linear infinite',
        margin: '0 auto 10px',
    },
    // 🎯 Debug Info 修正為淺色背景黑色字
    debugBox: {
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        padding: '10px',
        marginTop: '20px',
        fontSize: '0.9em',
        textAlign: 'left',
        width: '100%',
        color: 'black',
        borderRadius: '5px',
    },
};

// 由於 React 中的 CSS-in-JS 不直接支持 @keyframes，您需要在 /frontend/src/index.css 中加入此動畫：
// @keyframes spin {
//     0% { transform: rotate(0deg); }
//     100% { transform: rotate(360deg); }
// }