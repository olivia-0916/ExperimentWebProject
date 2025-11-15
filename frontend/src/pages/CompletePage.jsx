// /frontend/src/pages/CompletePage.jsx (修正 Email 顯示文字)

import React, { useEffect } from 'react';

// ===============================================
// ⚛️ Main Component
// ===============================================

export default function CompletePage() {
    
    // 實驗結束後，可以在這裡處理最終的數據記錄或狀態標記
    useEffect(() => {
        console.log("Experiment Completed.");
    }, []);

    // 移除了 const completionCode = "THANKYOU_NCCU_HCI_2025";

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>感謝您的參與！</h1>
            <p style={styles.intro}>
                您已完成本次實驗的所有環節。
            </p>

            <div style={styles.debriefingBlock}>
                <h2 style={styles.debriefingHeader}>事後揭露</h2>
                
                <p style={styles.debriefingText}>
                    非常感謝您參與本次關於「網路討論中夥伴的身份與論述呈現方式如何影響態度與感知」的研究。
                </p>
                <p style={styles.debriefingText}>
                    本研究實際目的是為了探討人們在討論議題時，若接觸到不同來源（人 vs. AI）與呈現方式（一致 vs. 不一致 vs. 雙面）的訊息，可能對使用者的立場產生哪些影響與心理感受。以此比較AI是否有可能加劇意見極化或是具有促進溝通與思辨的可能性。
                </p>
                <p style={styles.debriefingText}>
                    我們在前述說明中未揭露完整研究目的，是為了避免影響您的自然反應，確保研究資料的有效性與中立性。本研究不涉及任何風險，您的所有回覆都將匿名處理，僅用於學術目的。
                </p>
                
                <p style={styles.deceptionWarning}>
                    <span style={{fontWeight: 'bold'}}>請注意：</span> 為了確保研究結果的客觀性與科學性，請勿將此實驗設計細節告知其他潛在參與者，這將有助於我們收集真實有效的數據。
                </p>

                <p style={styles.debriefingText}>
                    若您對研究內容有任何問題或希望了解更多細節，歡迎隨時聯繫我們，我們非常樂意與您進一步說明。
                </p>
                
                <div style={styles.contactInfo}>
                    <p>📧 聯絡人：翁基紘、劉沐恩</p>
                    {/* 這裡已修正：將 'l13464030' 改回 '113464030' */}
                    <p>📮 Email：<a href="mailto:113464030@g.nccu.edu.tw" style={{color: PRIMARY_BLUE, textDecoration: 'none'}}>113464030@g.nccu.edu.tw</a></p>
                    <p>👨‍🏫 指導教授：侯宗佑（國立政治大學）</p>
                </div>

            </div>
            
            <p style={styles.finalMessage}>
                再次感謝您寶貴的參與！
            </p>
            
            {/* 已移除完成碼區域 */}
            
        </div>
    );
}

// ===============================================
// 🎨 樣式 (CompletePage)
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#cc0000'; // 用於警告文字

const styles = {
    container: {
        maxWidth: '850px',
        margin: '50px auto',
        padding: '40px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        textAlign: 'center',
        borderTop: `5px solid ${PRIMARY_BLUE}`,
    },
    header: {
        fontSize: '2.5em',
        color: PRIMARY_BLUE, 
        marginBottom: '10px',
    },
    intro: {
        fontSize: '1.2em',
        marginBottom: '40px',
        color: '#555',
    },
    debriefingBlock: {
        backgroundColor: '#f1f8ff',
        border: `1px solid ${PRIMARY_BLUE}`,
        borderRadius: '8px',
        padding: '30px',
        textAlign: 'left',
        marginBottom: '40px',
    },
    debriefingHeader: {
        fontSize: '1.6em',
        color: PRIMARY_BLUE,
        borderBottom: `1px dashed ${PRIMARY_BLUE}`,
        paddingBottom: '5px',
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    debriefingText: {
        fontSize: '1.05em',
        lineHeight: '1.7',
        color: '#333',
        marginBottom: '15px',
    },
    deceptionWarning: {
        fontSize: '1.05em',
        lineHeight: '1.7',
        color: WARNING_RED,
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#fff0f0',
        borderRadius: '5px',
        borderLeft: `5px solid ${WARNING_RED}`,
    },
    contactInfo: {
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '1px dashed #ccc',
        fontSize: '1em',
        lineHeight: '1.8',
        color: '#333',
    },
    finalMessage: {
        fontSize: '1.4em',
        fontWeight: 'bold',
        color: '#333',
        marginTop: '20px',
    },
    // 已移除 completionCode 樣式
};