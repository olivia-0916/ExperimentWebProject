// /frontend/src/components/ChatInterface.jsx (最終版：接收並傳遞 group_s)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = ''; 

// 🚀 關鍵：在 props 中接收 group_s
export default function ChatInterface({ group_s, group_st, group_n }) { 
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [roundCount, setRoundCount] = useState(0); 
    
    const MAX_ROUNDS = 5; 

    // 根據 n 和 st 決定顯示的角色名稱
    const partnerRole = group_n === 1 ? '討論夥伴 (真人)' : 'AI 機器人';
    const partnerName = (group_st === 0 && group_n === 1) ? 'Alice' : 
                        (group_st === 1 && group_n === 1) ? 'Bob' : 
                        'AI 助理'; 

    // 處理訊息發送和 API 呼叫 (保持不變)
    const handleSend = async (textToSend = input) => {
        if (textToSend.trim() === '' || isLoading || roundCount >= MAX_ROUNDS) return; 

        const userMessage = { role: 'user', content: textToSend };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/chat`, {
                messages: newMessages,
                st_group: group_st, 
                n_role: group_n,    
            });

            const assistantReply = { role: 'assistant', content: response.data.reply };
            setMessages((prev) => [...prev, assistantReply]);
            setRoundCount((prev) => prev + 1); 

        } catch (error) {
            console.error('Chat API Error:', error);
            alert('聊天服務錯誤，請檢查網路或後端狀態。'); 
        } finally {
            setIsLoading(false);
        }
    };
    
    // 🚀 關鍵：導航時將 group_s, group_st, group_n 一起傳遞
    const handleNavigateToPosttest = () => {
        navigate('/posttest-questionnaire', { 
            state: { 
                group_s: group_s,    // 傳遞 s 
                group_st: group_st,  // 傳遞 st
                group_n: group_n     // 傳遞 n
            } 
        });
    };
    
    // 第一次加載時發送初始訊息 (讓機器人開場)
    useEffect(() => {
        if (messages.length === 0 && !isLoading) {
            const initialMessage = {
                role: 'user',
                content: `你好，我們將進行 ${MAX_ROUNDS} 輪關於博愛座議題的討論。請你先開始發言。`,
            };
            handleSend(initialMessage.content);
        }
    }, []);

    const isDiscussionComplete = roundCount >= MAX_ROUNDS;

    return (
        <div className="chat-interface">
            <h2>與 {partnerName} (角色: {partnerRole}) 的討論 - 第 {roundCount} / {MAX_ROUNDS} 輪</h2>
            
            <div className="message-history" style={{ height: '300px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '8px' }}>
                        <span style={{ 
                            padding: '6px 10px', 
                            borderRadius: '15px', 
                            backgroundColor: msg.role === 'user' ? '#007bff' : '#e0e0e0', 
                            color: msg.role === 'user' ? 'white' : 'black',
                            display: 'inline-block',
                            maxWidth: '80%'
                        }}>
                            {msg.content}
                        </span>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                         <span style={{ padding: '6px 10px', borderRadius: '15px', backgroundColor: '#e0e0e0', color: 'black' }}>
                            {partnerName} 正在思考...
                        </span>
                    </div>
                )}
            </div>

            <div className="input-area" style={{ display: 'flex' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isDiscussionComplete ? '討論已結束' : '輸入您的回覆...'}
                    disabled={isLoading || isDiscussionComplete}
                    style={{ flexGrow: 1, padding: '10px', marginRight: '10px' }}
                />
                <button 
                    onClick={() => handleSend()} 
                    disabled={isLoading || input.trim() === '' || isDiscussionComplete}
                >
                    發送
                </button>
            </div>
            
            {/* 討論結束後顯示下一頁按鈕 */}
            {isDiscussionComplete && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p>討論已完成，請點擊下方按鈕繼續。</p>
                    <button onClick={handleNavigateToPosttest}>
                        進入注意力測試與問卷
                    </button>
                </div>
            )}
        </div>
    );
}