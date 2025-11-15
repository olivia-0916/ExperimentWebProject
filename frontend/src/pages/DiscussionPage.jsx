// /frontend/src/pages/DiscussionPage.jsx (最終穩定版：根據回覆字數動態調整動畫時長 + 間歇性暫停)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

// ===============================================
// 🎯 常數與配置
// ===============================================
const PRIMARY_BLUE = '#007bff';
const WARNING_RED = '#dc3545';
const DISCUSSION_TIME_LIMIT = 180; // 3 分鐘 (180 秒)
const MIN_MESSAGES = 5;          // 最小發言輪數
const PARTNER_NAME_ANONYMOUS = 'Chen Yuan'; // 匿名夥伴的固定名稱
const BASE_TYPING_DELAY_MS = 3000; // 基礎延遲時間 (3秒)，模擬思考或網路延遲
const PER_CHARACTER_DELAY_MS = 500; // 每個字元額外增加 0.5 秒的打字時間

// ** NEW CONFIG for Intermittent Typing **
const ANIMATION_INTERVAL_MS = 500; // 每 500ms 檢查一次狀態
const TYPING_PROBABILITY = 0.8; // 80% 的時間在打字 (20% 的時間在思考/暫停)


// ===============================================
// 🎯 輔助函數：立場文字轉換 (保持不變)
// ===============================================
const getStanceText = (stanceCode) => {
    switch (stanceCode) {
        case 0:
            return '反對';
        case 1:
            return '支持';
        case 2:
            return '中立';
        default:
            return '（未定）';
    }
};

// ===============================================
// 🎯 輔助函數：計時器格式化 (保持不變)
// ===============================================
const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

// ===============================================
// 🎯 數據儲存邏輯 (保持不變)
// ===============================================

const saveDiscussionEndLog = async (userId, data) => {
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
            'discussion_status' 
        );
        await setDoc(docRef, { 
            discussion_end: {
                timestamp: new Date().toISOString(),
                ...data
            }
        }, { merge: true });

        console.log("Discussion End Success: Data saved to Firestore.");
    } catch (e) {
        console.error("Save Log Error: Failed to save discussion end data.", e);
    }
};


// ===============================================
// 🎯 API 函數：發送訊息到後端 (保持不變)
// ===============================================
const sendChatToBackend = async (data) => {
    try {
        const response = await fetch('/api/chat/reply', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP Error: ${response.status}` }));
            console.error("Backend HTTP Error:", errorData);
            return null;
        }

        const result = await response.json();
        return result.reply; 
        
    } catch (error) {
        console.error("Fetch Error:", error);
        return null; 
    }
};


// ===============================================
// 🎯 新增組件：正在輸入中... 動畫 (保持不變)
// ===============================================
const TypingIndicator = ({ partnerName }) => {
    const globalStyle = `
        @keyframes typing-bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-3px); }
        }
    `;

    const indicatorStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#e9ecef', 
        padding: '8px 15px',
        borderRadius: '15px',
        marginBottom: '10px',
        maxWidth: 'fit-content',
        alignSelf: 'flex-start',
        textAlign: 'left',
        color: '#495057', 
        fontSize: '0.9em',
        marginLeft: '15px', 
    };

    const dotStyle = (delay) => ({
        width: '5px',
        height: '5px',
        backgroundColor: '#495057',
        borderRadius: '50%',
        margin: '0 1px',
        display: 'inline-block',
        animation: `typing-bounce 1s infinite ${delay}`,
    });

    return (
        <div style={indicatorStyle}>
            <style>{globalStyle}</style>
            <span style={{ marginRight: '5px', fontWeight: 'bold' }}>{partnerName}:</span>
            <div style={dotStyle('0s')}></div>
            <div style={dotStyle('0.15s')}></div>
            <div style={dotStyle('0.3s')}></div>
        </div>
    );
};


// ===============================================
// ⚛️ Main Component
// ===============================================

export default function DiscussionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = window.currentUserId;

    // 接收所有實驗變數：N, S, C, ST (從 DiscussionAllocationPage 傳入)
    const groupN = location.state?.groupN; // 0=AI, 1=Human/Anonymous
    const userStance = location.state?.userStance; // 0=反對, 1=支持, 2=中立
    const contentC = location.state?.contentC; 
    const consistencySt = location.state?.consistencySt; 
    
    // 聊天狀態
    const [messages, setMessages] = useState([]); 
    const [inputContent, setInputContent] = useState('');
    const [messageCount, setMessageCount] = useState(0); 
    const [timeRemaining, setTimeRemaining] = useState(DISCUSSION_TIME_LIMIT);
    const [discussionEnded, setDiscussionEnded] = useState(false);
    
    // 狀態 1: 追蹤訊息是否正在發送/等待回覆
    const [isSending, setIsSending] = useState(false); 
    
    // 狀態 2: 追蹤對方是否正在輸入
    const [isTyping, setIsTyping] = useState(false); // 控制點點動畫是否顯示
    
    // 根據 groupN 動態產生標題和夥伴名稱
    const { chatTitle, partnerName } = useMemo(() => {
        if (groupN === 0) {
            return {
                chatTitle: '與 AI 聊天機器人的討論',
                partnerName: 'AI 聊天機器人'
            };
        } else { 
            return {
                chatTitle: `與匿名參與者 ${PARTNER_NAME_ANONYMOUS} 的討論`,
                partnerName: PARTNER_NAME_ANONYMOUS
            };
        }
    }, [groupN]); 
    
    // 判斷是否滿足結束條件 (保持不變)
    const isReadyToEnd = useMemo(() => {
        const messagesMet = messageCount >= MIN_MESSAGES; 
        return messagesMet; 
    }, [messageCount]);

    // ===============================================
    // Timer Effect (保持不變)
    // ===============================================
    useEffect(() => {
        if (discussionEnded || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!discussionEnded) setDiscussionEnded(true); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [discussionEnded, timeRemaining]);
    
    // ===============================================
    // Discussion End Handler (保持不變)
    // ===============================================
    const handleDiscussionEnd = () => {
        saveDiscussionEndLog(userId, {
            end_type: isReadyToEnd ? 'Ready_To_End' : 'Forced_End',
            time_spent: DISCUSSION_TIME_LIMIT - timeRemaining,
            message_count: messageCount,
            group_n: groupN, 
            user_stance: userStance,
            content_c: contentC, 
            consistency_st: consistencySt
        });
        
        navigate('/attention-check', { 
            state: { groupN, userStance, contentC, consistencySt },
            replace: true
        });
    };
    
    // ===============================================
    // ⭐ 核心修正：訊息發送函數 - 動態調整輸入動畫時間與間歇性
    // ===============================================
    const handleSendMessage = async () => {
        const currentMessage = inputContent.trim();
        if (currentMessage === '' || discussionEnded || isSending) return; 
        
        // 確保不會在對方打字時發送新訊息 (雖然輸入框已被禁用，但這是一個安全檢查)
        if (isTyping) return; 

        // 1. 立即顯示使用者發言
        setMessages(prev => [...prev, { sender: 'You', text: currentMessage, timestamp: Date.now() }]);
        
        // 2. 清空輸入框並鎖定 UI
        setInputContent('');
        setIsSending(true); 
        
        // 3. 構造發送給後端的數據
        const requestData = {
            userId: userId,
            messages: [...messages, { sender: 'You', text: currentMessage, timestamp: Date.now() }], 
            groupN: groupN,
            userStance: userStance,
            contentC: contentC,
            consistencySt: consistencySt,
            messageCount: messageCount + 1 
        };
        
        let intervalId = null; // 用於控制間歇性動畫的計時器 ID
        let startTimestamp = Date.now();
        let animationDuration = 0; // 總動畫時長
        let partnerReply = null;

        try {
            // 4. 同時啟動後端請求 (Promise)
            const replyPromise = sendChatToBackend(requestData);

            // 5. 如果是人類夥伴 (groupN === 1)，先啟動間歇性打字動畫
            if (groupN === 1) {
                // 由於我們需要 replyLength 才能決定總動畫時長，這裡必須先等待回覆
                
                partnerReply = await replyPromise; // 等待後端回覆
                
                // 收到回覆後，計算總動畫持續時間
                if (partnerReply) {
                    const replyLength = partnerReply.length;
                    // 總時長 = 基礎延遲 + (字數 * 每字元延遲)
                    animationDuration = BASE_TYPING_DELAY_MS + (replyLength * PER_CHARACTER_DELAY_MS);
                } else {
                    // 如果沒有回覆，快速結束
                    animationDuration = 2000; 
                }

                // 啟動間歇性動畫邏輯
                let elapsed = 0;
                
                intervalId = setInterval(() => {
                    elapsed += ANIMATION_INTERVAL_MS; 

                    // 檢查是否達到總動畫時長
                    if (elapsed >= animationDuration) {
                        clearInterval(intervalId);
                        setIsTyping(false); 
                        
                        // 當動畫結束時，顯示回覆內容
                        if (partnerReply) {
                            setMessageCount(prev => prev + 1); 
                            setMessages(prev => [...prev, { 
                                sender: 'Partner', 
                                text: partnerReply, 
                                timestamp: Date.now() 
                            }]);
                        }
                        
                        // 解鎖 UI
                        setIsSending(false); 
                        return; // 結束計時器邏輯
                    }
                    
                    // 模擬打字/思考：在總時長內隨機切換顯示狀態
                    // 有 TYPING_PROBABILITY (80%) 的機率顯示動畫
                    if (Math.random() < TYPING_PROBABILITY) {
                        setIsTyping(true);
                    } else {
                        // 20% 的機率暫停，模擬思考 
                        setIsTyping(false);
                    }
                }, ANIMATION_INTERVAL_MS); 

                // 在動畫啟動時，立即開始顯示點點
                setIsTyping(true); 

            } else {
                // 6. 如果是 AI (groupN === 0) 或連線失敗，則無需間歇動畫，快速處理
                partnerReply = await replyPromise;
                
                // 延遲 2 秒顯示 AI 回覆
                setTimeout(() => {
                    if (partnerReply) {
                        setMessageCount(prev => prev + 1); 
                        setMessages(prev => [...prev, { 
                            sender: 'Partner', 
                            text: partnerReply, 
                            timestamp: Date.now() + 2000 
                        }]);
                    } else {
                         setMessages(prev => [...prev, { 
                             sender: 'System', 
                             text: '（系統：連線失敗或無回覆。請嘗試重新發送。）', 
                             timestamp: Date.now() + 2000 
                         }]);
                    }
                    setIsSending(false); // 解鎖 UI
                }, 2000); // 2秒延遲

            }
        } catch (error) {
             console.error("Sending/Receiving Error:", error);
             if (intervalId) clearInterval(intervalId); // 發生錯誤時停止計時器
             setIsTyping(false);
             setIsSending(false); // 解鎖 UI
             setMessages(prev => [...prev, { 
                 sender: 'System', 
                 text: '（系統：連線發生嚴重錯誤。）', 
                 timestamp: Date.now() 
             }]);
        } finally {
            // 注意: 在 groupN === 1 的情況下，setIsSending(false) 被移到 intervalId 結束時觸發，
            // 以確保在動畫跑完之前 UI 是鎖定的。
            // 這裡只需要確保在非 groupN=1 的情況下，isSending 會被解除。
            if (groupN === 0) {
                 // 這是 AI 的情況，等待 setTimeout 完成再解除 isSending (已在 setTimeout 內處理)
            }
        }
    };

    // 根據 userStance 顯示的立場文字
    const userStanceText = getStanceText(userStance);

    return (
        <div style={styles.container}>
            <div style={styles.headerBar}>
                <h1 style={styles.title}>{chatTitle}</h1> 
                <span style={styles.timer}>剩餘時間：{formatTime(timeRemaining)}</span>
            </div>

            <div style={styles.chatArea}>
                {/* 修正點 1 & 2: 使用包含立場資訊的新系統訊息 */}
                <div style={styles.systemMessage}>
                    <p style={{ margin: 0 }}>請開始討論您對博愛座議題的看法。</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: WARNING_RED }}>
                        ⚠️ 您的立場為「{userStanceText}」，請您向對方說明您抱持此立場的理由。
                    </p>
                </div>

                <div style={styles.instructionBlock}>
                    (提示：您已發言 {messageCount} 輪，最少需 {MIN_MESSAGES} 輪即可提前結束測試)
                </div>

                {/* 消息顯示 */}
                <div style={styles.messageList}>
                    {messages.map((msg, index) => (
                        <div key={index} style={msg.sender === 'You' ? styles.userMessage : styles.partnerMessage}>
                            <strong>{msg.sender === 'You' ? 'You' : partnerName}:</strong> {msg.text}
                        </div>
                    ))}
                    
                    {/* 渲染：顯示正在輸入中...動畫 */}
                    {groupN === 1 && isTyping && (
                        <TypingIndicator partnerName={partnerName} />
                    )}
                </div>

                {/* 輸入區 */}
                <div style={styles.inputArea}>
                    <input
                        type="text"
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        placeholder={isSending ? '等待對方回覆中...' : discussionEnded ? '討論已結束或輪數已滿。' : '請輸入您的討論內容...'}
                        // 確保在討論中、發送中、或對方輸入中時禁用輸入框
                        disabled={discussionEnded || isSending} // 只要 isSending 為 true，就鎖定輸入框
                        style={styles.textInput}
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') handleSendMessage(); 
                        }}
                    />
                    <button 
                        onClick={handleSendMessage} 
                        // 確保在討論中、輸入內容為空、發送中時禁用發送按鈕
                        disabled={discussionEnded || inputContent.trim() === '' || isSending}
                        style={styles.sendButton}
                    >
                        {isSending ? '等待中...' : '發送'}
                    </button>
                </div>
            </div>

            {/* 結束討論按鈕 (保持不變) */}
            <div style={styles.endSection}>
                <button
                    onClick={handleDiscussionEnd}
                    disabled={!isReadyToEnd}
                    style={isReadyToEnd ? styles.endButton : styles.disabledEndButton}
                >
                    結束討論，進入下一階段問卷
                </button>
                <p style={styles.warningReminder}>
                    提醒： 討論時間未滿 {formatTime(DISCUSSION_TIME_LIMIT)} 且未滿 {MIN_MESSAGES} 輪時，按鈕將禁用。
                </p>
            </div>
        </div>
    );
}

// ===============================================
// 🎨 樣式 (保持不變)
// ===============================================
const styles = {
    container: {
        maxWidth: '900px',
        margin: '50px auto',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
    },
    headerBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '15px',
        borderBottom: `2px solid ${PRIMARY_BLUE}`,
        marginBottom: '20px',
    },
    title: {
        fontSize: '1.6em',
        color: PRIMARY_BLUE,
    },
    timer: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: WARNING_RED,
    },
    chatArea: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        minHeight: '400px',
    },
    messageList: {
        flexGrow: 1,
        overflowY: 'auto',
        marginBottom: '15px',
        padding: '5px',
    },
    userMessage: {
        backgroundColor: '#d9edf7', // 淺藍色
        padding: '8px 15px',
        borderRadius: '15px',
        marginBottom: '10px',
        maxWidth: '70%',
        alignSelf: 'flex-end',
        marginLeft: 'auto',
        textAlign: 'right',
        color: '#1e3857',
    },
    partnerMessage: {
        backgroundColor: '#e9ecef', // 淺灰色
        padding: '8px 15px',
        borderRadius: '15px',
        marginBottom: '10px',
        maxWidth: '70%',
        alignSelf: 'flex-start',
        textAlign: 'left',
        color: '#495057',
    },
    systemMessage: {
        // 保持原來的 systemMessage 樣式
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
        border: '1px solid #ffeeba',
        fontSize: '1.05em',
    },
    instructionBlock: {
        backgroundColor: '#fff',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
        color: '#555',
        fontSize: '0.9em',
        border: '1px dashed #ccc',
    },
    inputArea: {
        display: 'flex',
        marginTop: '15px',
    },
    textInput: {
        flexGrow: 1,
        padding: '12px',
        fontSize: '1em',
        border: '1px solid #ccc',
        borderRadius: '5px 0 0 5px',
        boxSizing: 'border-box',
    },
    sendButton: {
        padding: '12px 20px',
        fontSize: '1em',
        backgroundColor: PRIMARY_BLUE,
        color: 'white',
        border: 'none',
        borderRadius: '0 5px 5px 0',
        cursor: 'pointer',
    },
    endSection: {
        marginTop: '30px',
        textAlign: 'center',
    },
    endButton: {
        padding: '15px 30px',
        fontSize: '1.3em',
        backgroundColor: PRIMARY_BLUE,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
    },
    disabledEndButton: {
        padding: '15px 30px',
        fontSize: '1.3em',
        backgroundColor: '#6c757d',
        color: '#f8f9fa',
        border: 'none',
        borderRadius: '8px',
        cursor: 'not-allowed',
        fontWeight: 'bold',
    },
    warningReminder: {
        color: WARNING_RED,
        fontSize: '0.9em',
        marginTop: '15px',
    }
};