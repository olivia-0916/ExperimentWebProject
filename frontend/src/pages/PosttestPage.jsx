// /frontend/src/pages/PosttestPage.jsx (移除氣泡前綴修正版)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = ''; 
const CHAT_ENDPOINT = '/api/chat';
const MAX_TURNS = 5; // 限制討論輪數 (使用者發言 5 次 + AI 回覆 5 次)

// 觀點地圖
const VIEWPOINT_MAP = {
    0: '反對保留博愛座', // st=0
    1: '支持保留博愛座', // st=1
    2: '兩面觀點（中立）' // st=2
};

// ==========================================================
// 🎯 提取 AI 第一次發言的邏輯 (直接拋出觀點 - 沿用上一個版本的修正)
// ==========================================================
const fetchInitialAIMessage = async (st_group, n_role) => {
    let initialReply = '';

    if (st_group === 1) {
        // st=1: 支持保留博愛座
        initialReply = "我認為博愛座仍然有其存在的價值，它確保真正有需要的人在搭乘大眾運輸時能獲得基本保障。請問您的看法是什麼？";
    } else if (st_group === 0) {
        // st=0: 反對保留博愛座
        initialReply = "我覺得博愛座的設置已經不合時宜，這類設施應該廢除，以避免社會資源浪費和潛在的爭議。您對此有何見解？";
    } else if (st_group === 2) {
        // st=2: 雙面/中立
        initialReply = "對於博愛座的存廢，我認為雙方各有論點，既要考慮弱勢群體的需求，也要避免道德綁架。請問您比較偏向哪一邊的觀點？";
    } else {
        initialReply = "歡迎進入討論，請您先開始發言。";
    }
    
    return { role: 'assistant', content: initialReply };
}


export default function PosttestPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);

    // 接收 ExperimentPage 傳來的分組結果
    const group_s = location.state?.group_s;   // 參與者立場 (0:反, 1:正)
    const group_st = location.state?.group_st; // AI/夥伴的觀點 (0:反, 1:正, 2:雙面)
    const group_n = location.state?.group_n;   // AI/夥伴的角色 (0:AI, 1:人)

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [turnCount, setTurnCount] = useState(0); 
    const [isInitialMessageSent, setIsInitialMessageSent] = useState(false); 

    // 角色和觀點的文字描述
    const roleText = group_n === 0 ? 'AI 機器人' : '匿名使用者';
    const viewpointText = VIEWPOINT_MAP[group_st] || '未定義觀點';

    // 處理 AI 第一次發言 (直接發言觀點)
    useEffect(() => {
        if (group_s === undefined || isInitialMessageSent) return;

        setIsLoading(true);
        
        fetchInitialAIMessage(group_st, group_n)
            .then(initialMessage => {
                setMessages([initialMessage]); 
                setIsInitialMessageSent(true);
            })
            .catch(error => {
                console.error("初始化失敗:", error);
                setMessages([{ role: 'error', content: '初始化錯誤。' }]);
            })
            .finally(() => {
                setIsLoading(false);
            });

    }, [group_s, group_st, group_n, isInitialMessageSent]);
    
    // 自動滾動到最新訊息
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 檢查是否已達輪數上限
    useEffect(() => {
        if (turnCount >= MAX_TURNS && !isLoading) {
            
            navigate('/posttest-questionnaire', { 
                state: { 
                    group_s, 
                    group_st, 
                    group_n, 
                    final_chat_logs: messages.filter(m => m.role !== 'system' && m.role !== 'error') 
                } 
            });
        }
    }, [turnCount, isLoading, messages, navigate, group_s, group_st, group_n]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading || turnCount >= MAX_TURNS || !isInitialMessageSent) return;

        // 🎯 將使用者發言的角色名稱設為 'user'
        const userMessage = { role: 'user', content: input }; 
        const newMessages = [...messages, userMessage];
        
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const chatHistory = newMessages.filter(m => m.role === 'user' || m.role === 'assistant');

            const response = await axios.post(`${API_BASE_URL}${CHAT_ENDPOINT}`, {
                messages: chatHistory, 
                st_group: group_st,
                n_role: group_n
            });

            const aiReply = response.data.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
            setTurnCount(prev => prev + 1); 

        } catch (error) {
            console.error('聊天服務錯誤:', error);
            alert('聊天服務錯誤，請檢查網路或後端日誌。');
            setMessages(prev => [...prev, { role: 'error', content: '服務錯誤，請重試。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (group_s === undefined) {
        return <div className="page-content" style={styles.container}>錯誤：無法取得完整的實驗分組資訊。</div>;
    }

    // 🎯 決定非使用者 (AI/夥伴) 的顯示名稱
    const partnerDisplayName = group_n === 0 ? 'AI' : '匿名使用者'; 


    return (
        <div className="page-content" style={styles.container}>
            <h1>進入博愛座議題討論</h1>

            {/* Debug Info */}
            <div style={styles.debugBox}>
                <p>除錯資訊 (開發階段用):</p>
                <p>參與者立場分組 (s): {group_s === 0 ? '反方' : '正方'}</p>
                <p>觀點分組 (st): {group_st} ({viewpointText})</p>
                <p>角色分組 (n): {group_n} ({roleText})</p>
            </div>
            
            {/* Header */}
            <div style={styles.chatHeader}>
                與 {roleText} (觀點: {viewpointText}) 的討論 - 第 {turnCount} / {MAX_TURNS} 輪
            </div>

            {/* 聊天訊息顯示區域 */}
            <div style={styles.messageBox}>
                {messages.map((msg, index) => (
                    (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'error') && (
                        <div key={index} style={{
                            ...styles.messageBubble,
                            ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                            ...(msg.role === 'user' ? { marginLeft: 'auto' } : { marginRight: 'auto' })
                        }}>
                            {/* 🎯 關鍵修正：判斷角色並只顯示內容，移除強制的「夥伴」和「您」前綴 */}
                            {msg.role === 'error' ? (
                                <span style={{ color: 'red', fontWeight: 'bold' }}>服務錯誤，請重試。</span>
                            ) : (
                                <p style={styles.messageContent}>
                                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                                        {msg.role === 'user' ? '您' : partnerDisplayName}：
                                    </span>
                                    {msg.content}
                                </p>
                            )}
                        </div>
                    )
                ))}
                {isLoading && (
                    <div style={styles.loadingBubble}>
                        {roleText} 正在輸入...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 輸入區域 */}
            {turnCount < MAX_TURNS && isInitialMessageSent && (
                <div style={styles.inputArea}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="輸入您的回覆..."
                        style={styles.textarea}
                        rows="3"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={isLoading || input.trim() === ''}
                        style={styles.sendButton}
                    >
                        {isLoading ? '發送中...' : '發送'}
                    </button>
                </div>
            )}
            
            {/* 結束按鈕只有在輪數到達上限時顯示 */}
            {turnCount >= MAX_TURNS && (
                <button 
                    onClick={() => navigate('/posttest-questionnaire', { state: { group_s, group_st, group_n, final_chat_logs: messages.filter(m => m.role !== 'system' && m.role !== 'error') } })}
                    style={styles.finishButton}
                >
                    討論結束，前往問卷
                </button>
            )}
        </div>
    );
}

// 樣式
const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white', 
        padding: '20px', 
        color: 'black' 
    },
    debugBox: {
        backgroundColor: '#f0f0f0', 
        border: '1px solid #ccc',
        padding: '10px',
        marginBottom: '20px',
        fontSize: '0.9em',
        color: 'black' 
    },
    chatHeader: {
        textAlign: 'center',
        padding: '10px',
        backgroundColor: '#e0e0e0', 
        border: '1px solid #ccc',
        color: 'black', 
        fontWeight: 'bold',
    },
    messageBox: {
        height: '400px',
        overflowY: 'scroll',
        padding: '15px',
        border: '1px solid #ccc',
        backgroundColor: '#f9f9f9', 
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '10px',
    },
    messageBubble: {
        maxWidth: '70%',
        padding: '10px',
        borderRadius: '15px',
        marginBottom: '10px',
        fontSize: '0.95em',
        boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
        // 🎯 修正：移除氣泡內 margin/padding
        display: 'block',
    },
    messageContent: {
        margin: 0, // 確保內容段落沒有額外間距
    },
    userBubble: {
        backgroundColor: '#007bff', 
        color: 'white',
        alignSelf: 'flex-end',
        borderBottomRightRadius: '0',
    },
    assistantBubble: {
        backgroundColor: '#ffffff', 
        color: 'black',
        border: '1px solid #e0e0e0',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: '0',
    },
    loadingBubble: {
        backgroundColor: '#e0f7fa',
        color: '#007bff',
        padding: '10px',
        borderRadius: '15px',
        marginBottom: '10px',
        maxWidth: '200px',
        fontStyle: 'italic',
        fontSize: '0.9em',
    },
    inputArea: {
        display: 'flex',
        border: '1px solid #ccc',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
    },
    textarea: {
        flexGrow: '1',
        border: 'none',
        padding: '10px',
        resize: 'none',
        fontSize: '1em',
        backgroundColor: 'white', 
        color: 'black', 
    },
    sendButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1em',
        transition: 'background-color 0.3s',
        minWidth: '70px',
    },
    finishButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '12px 25px',
        fontSize: '1.1em',
        width: '100%',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '10px',
    }
};