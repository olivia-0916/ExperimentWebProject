import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// ===============================================
// 🎯 數據儲存邏輯 (修正：新增 C, ST, checkpass)
// ===============================================

const saveEmail = async (email, groups) => {
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
            'final_contact' 
        );

        // 將 Email 與實驗組別和立場數據一起儲存
        await setDoc(docRef, { 
            email_address: email,
            // ⭐ 確保所有變數都有傳入
            group_n: groups.groupN, 
            user_stance: groups.userStance,
            content_c: groups.contentC,
            consistency_st: groups.consistencySt,
            checkpass: groups.checkpass,
            timestamp: new Date().toISOString(),
        }, { merge: true });

        console.log("Email Collection Success: Data saved to Firestore.");
    } catch (e) {
        console.error("Save Log Error: Failed to save email data.", e);
    }
};

// ===============================================
// ⚛️ Main Component
// ===============================================

export default function EmailCollectionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ⭐ 接收所有變數，使用 ?? null/0 確保預設值正確
    const groupN = location.state?.groupN ?? null;
    const userStance = location.state?.userStance ?? null; 
    const contentC = location.state?.contentC ?? null; 
    const consistencySt = location.state?.consistencySt ?? null; 
    const checkpass = location.state?.checkpass ?? 0; // 預設為 0
    
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 簡單的 Email 格式檢查
    const isEmailValid = useMemo(() => {
        // 檢查是否為空、是否包含 @ 符號，並進行簡單的格式檢查
        return email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, [email]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEmailValid || isSubmitting) return;

        setIsSubmitting(true);
        
        const allGroups = { groupN, userStance, contentC, consistencySt, checkpass };

        // 1. 儲存 Email 與組別數據
        await saveEmail(email, allGroups);
        
        setIsSubmitting(false);

        // 2. ⭐ 導航到最終的資訊揭露頁 (假設路徑為 /complete-page)
        const targetPath = '/complete-page';
        
        console.log("Email Submitted. Navigating to Final Page:", targetPath);

        // 將組別變數傳遞給最終頁面，以備不時之需
        navigate(targetPath, { state: allGroups }); 
    };

    // ... (渲染部分保持不變)

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>參與獎金聯繫資訊</h1>
            <p style={{...styles.intro, color: NEUTRAL_GRAY, fontWeight: 'bold'}}>
                （系統檢查：Checkpass={checkpass}）
            </p>
            <p style={styles.intro}>
                為在研究結束後發放參與獎金，請您留下方便與您聯繫的Email地址。
                <br/>請確保Email地址正確，否則將無法收到獎金發放通知。
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
                
                <div style={styles.inputGroup}>
                    <label htmlFor="email" style={styles.label}>
                        Email:
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.emailInput}
                        placeholder="請填寫您的Email"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!isEmailValid || isSubmitting}
                    style={isEmailValid ? styles.submitButton : styles.disabledButton}
                >
                    {isSubmitting ? '正在儲存數據...' : '確認並進入結束頁面'}
                </button>
                {!isEmailValid && email.trim() !== '' && (
                    <p style={styles.warningText}>請輸入有效的Email地址。</p>
                )}
            </form>
        </div>
    );
}


// ===============================================
// 🎨 樣式 (EmailCollectionPage)
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const NEUTRAL_GRAY = '#6c757d';

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
        marginBottom: '20px',
    },
    intro: {
        fontSize: '1.1em',
        marginBottom: '40px',
        lineHeight: '1.6',
        color: '#555',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
    },
    inputGroup: {
        width: '100%',
        maxWidth: '450px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
        fontSize: '1.1em',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#333',
    },
    emailInput: {
        width: '100%',
        padding: '12px 15px',
        border: `2px solid ${NEUTRAL_GRAY}`,
        borderRadius: '6px',
        fontSize: '1.1em',
        boxSizing: 'border-box',
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
        marginTop: '20px',
        transition: 'background-color 0.3s',
        maxWidth: '300px',
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
        marginTop: '20px',
        maxWidth: '300px',
    },
    warningText: {
        color: WARNING_RED,
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: '10px',
    }
};