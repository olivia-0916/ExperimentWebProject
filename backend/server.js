// /backend/server.js (最終修正版 - 整合 N, C, ST 與正確路由)

import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

// 1. 載入環境變數
dotenv.config(); 

const app = express();
// 確保埠號與您前端的 vite.config.js 代理目標一致
const port = 3001; 

// 2. 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// 3. 中介軟體設定
// 允許前端開發伺服器 (假設運行在 5173) 訪問
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json()); // 處理 JSON 請求體

// ===============================================
// 🎯 核心路由修正：/api/chat/reply
// ===============================================
app.post('/api/chat/reply', async (req, res) => {
  // 1. 從請求體中解構所有必要的實驗變數
  const { 
    message, 
    groupN,          // N: 夥伴類型 (0=AI, 1=Human)
    contentC,        // C: 夥伴內容立場 (0=反對, 1=支持)
    consistencySt,   // ST: 立場一致性 (0=不一致, 1=一致)
    messageCount,    // 輪數 (可輔助操弄 ST)
    messages         // 整個對話歷史
  } = req.body; 
  
  // 決定夥伴立場的描述
  const stanceC = contentC === 1 ? '支持' : '反對';
  const consistencyText = consistencySt === 1 ? '（你的立場與受試者一致）' : '（你的立場與受試者不一致）';
  
  let roleType = "";
  let toneInstruction = "";
  
  if (groupN === 0) {
    // N=0: 扮演 AI 機器人
    roleType = "你是一個AI聊天機器人";
    toneInstruction = "請保持客觀、中立、清晰、理性地回覆，並以 AI 的身份進行對話。回答時請不要使用過於情緒化或人類化的詞語。";
  } else {
    // N=1: 扮演匿名人類參與者
    roleType = "你是一個匿名參與實驗的網友";
    toneInstruction = "你的目標是進行一場自然的、像人類一樣的討論。請保持隨性、語氣輕鬆、可以偶爾帶有個人情緒，避免使用學術語言。";
  }

  // 2. 構造系統提示詞 (System Prompt) - **整合所有操弄變數**
  const systemPrompt = `
    ${roleType}，正在和另一位參與者討論博愛座議題。
    
    你的核心立場是：**絕對${stanceC}博愛座**。
    
    你的任務是根據你的立場和討論環境進行回應。
    ${toneInstruction}
    
    ${consistencyText}
    
    **重要規則：**
    1. 你的每一次發言都必須堅定地基於「${stanceC}博愛座」的立場。
    2. 你的回覆必須是中文，長度適中（約 2-3 句話）。
  `;
  
  try {
    // 3. 構造發送給 OpenAI 的訊息列表
    const conversation = [
        { role: "system", content: systemPrompt },
        // 轉換前端的聊天記錄格式
        // 由於前端在發送前已經加入了最後一則訊息，這裡只需確保順序正確
        ...messages.map(msg => ({ 
            role: msg.sender === 'You' ? 'user' : 'assistant', 
            content: msg.text 
        }))
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 推薦 gpt-4 或 gpt-4-turbo 獲得更好的角色扮演效果
      messages: conversation,
      temperature: 0.7, // 保持一定創意度，避免重複
      max_tokens: 200, // 限制回覆長度，避免過長
    });

    const aiReply = response.choices[0].message.content;

    // 4. 返回 JSON 回覆
    res.json({ reply: aiReply });

  } catch (error) {
    console.error("OpenAI API Error:", error.message);
    res.status(500).json({ 
        reply: "（後端服務錯誤：無法取得 AI 回覆。）" 
    });
  }
});


// 伺服器啟動
app.listen(port, () => {
  console.log(`✅ 後端伺服器已啟動並運行在 http://localhost:${port}`);
  console.log(`   API 端點: http://localhost:${port}/api/chat/reply`);
});