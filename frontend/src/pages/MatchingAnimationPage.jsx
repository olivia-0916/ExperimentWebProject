import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ===============================================
// 🎯 常數與樣式
// ===============================================
const PRIMARY_BLUE = '#007bff';
const BACKGROUND_COLOR = '#111827'; // 接近黑色的背景
const TEXT_COLOR = '#E5E7EB';     // 淺色文本

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BACKGROUND_COLOR,
        color: TEXT_COLOR,
        padding: '20px',
        textAlign: 'center',
    },
    header: {
        fontSize: '2em',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: PRIMARY_BLUE,
    },
    message: {
        fontSize: '1.2em',
        marginBottom: '30px',
        maxWidth: '500px',
        lineHeight: '1.6',
    },
    // 加載動畫容器樣式
    spinnerContainer: {
        position: 'relative',
        width: '80px',
        height: '80px',
        marginBottom: '40px',
    },
    // 加載動畫的 CSS
    spinnerStyle: {
        borderRadius: '50%',
        height: '80px',
        width: '80px',
        border: `8px solid ${TEXT_COLOR}40`, // 淺色半透明的環
        borderTop: `8px solid ${PRIMARY_BLUE}`, // 藍色的頂部
        animation: 'spin 1.5s linear infinite',
    },
    // 注入 CSS 動畫
    globalStyle: `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `,
};


// ===============================================
// ⚛️ 主要組件
// ===============================================

export default function MatchingAnimationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [elapsedTime, setElapsedTime] = useState(0);

    // 從前一頁接收分組和立場資訊
    const groupN = location.state?.groupN;
    const userStance = location.state?.userStance;
    const checkpass = location.state?.checkpass;

    // 隨機生成延遲時間 (5000ms 到 10000ms 之間)
    const randomDelay = useMemo(() => {
        return Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    }, []);

    useEffect(() => {
        // 開始計時
        const startTime = Date.now();
        const interval = setInterval(() => {
            setElapsedTime(Date.now() - startTime);
        }, 100);

        // 設置延遲後跳轉
        const timer = setTimeout(() => {
            clearInterval(interval);
            console.log(`Matching complete after ${randomDelay}ms. Navigating to DiscussionAllocationPage.`);
            
            navigate('/discussion-allocation', { 
                state: { 
                    groupN: groupN, 
                    userStance: userStance,
                    checkpass: checkpass
                },
                replace: true // 替換掉當前頁面，避免回退
            });
        }, randomDelay);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [navigate, randomDelay, groupN, userStance, checkpass]);

    // 格式化顯示時間
    const secondsRemaining = Math.max(0, Math.ceil((randomDelay - elapsedTime) / 1000));
    
    return (
        <div style={styles.container}>
            {/* 注入 CSS 動畫 */}
            <style>{styles.globalStyle}</style>

            <h1 style={styles.header}>夥伴匹配中...</h1>
            <p style={styles.message}>
                系統正在為您匹配適合的**線上受試者**，請您稍候。
                這可能需要一些時間。
            </p>

            <div style={styles.spinnerContainer}>
                 <div style={styles.spinnerStyle}></div>
            </div>

            <p style={styles.message}>
                預計剩餘時間：約 {secondsRemaining} 秒
            </p>
            
        </div>
    );
}