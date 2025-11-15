// /frontend/src/pages/NeutralEndPage.jsx (最終修正版：導航至 /complete-page)

import React from 'react';
import { useNavigate } from 'react-router-dom';

// ===============================================
// 🎨 顏色常數與樣式定義 (保持與其他頁面風格一致)
// ===============================================
const PRIMARY_BLUE = '#007bff';
const LIGHT_GRAY = '#f0f0f0';
const DARK_TEXT = '#333';

const styles = {
    container: {
        maxWidth: '700px',
        margin: '50px auto',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    header: {
        fontSize: '2.5em',
        color: PRIMARY_BLUE,
        marginBottom: '20px',
        borderBottom: `3px solid ${LIGHT_GRAY}`,
        paddingBottom: '15px',
    },
    paragraph: {
        fontSize: '1.2em',
        lineHeight: '1.8',
        color: DARK_TEXT,
        marginBottom: '30px',
        textAlign: 'justify',
        padding: '0 20px',
    },
    button: {
        padding: '15px 30px',
        fontSize: '1.3em',
        backgroundColor: PRIMARY_BLUE,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
        marginTop: '20px',
    },
    buttonHover: {
        backgroundColor: '#0056b3',
    }
};

// ===============================================
// ⚛️ NeutralEndPage 組件
// ===============================================

export default function NeutralEndPage() {
    const navigate = useNavigate();

    // 處理點擊，導航到最終的 CompletePage
    const handleFinish = () => {
        // ⭐ 核心修正：路徑必須與 main.jsx 中定義的 '/complete-page' 完全一致
        navigate('/complete-page', { replace: true });
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>  感謝您的參與  </h1>
            <p style={styles.paragraph}>
                您好，非常感謝您撥冗參與本次實驗的前測階段。
                <br /><br />
                由於您所屬的樣本範圍，本研究已擁有足夠數據，非常感謝您的參與，系統將引導您至結束畫面。
            </p>
            
            <button
                onClick={handleFinish}
                style={styles.button}
                // 可以添加 onMouseEnter / onMouseLeave 實現簡單 hover 效果
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.buttonHover.backgroundColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = styles.button.backgroundColor}
            >
                進入最終結束畫面
            </button>
        </div>
    );
}