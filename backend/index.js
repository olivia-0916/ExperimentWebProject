// /backend/index.js (最終穩定運行版本 - 解決所有模組綁定和 Firebase 兼容性問題)

import express from 'express';
import cors from 'cors'; 
// 修正 1: 使用預設導入來處理 CommonJS 模組，並將整個套件物件命名為 adminPkg
import adminPkg from 'firebase-admin'; 

import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// 載入環境變數
dotenv.config();

// ===============================================
// 🎯 檢查 Firebase 服務帳戶讀取與錯誤檢查
// ===============================================
let serviceAccount;
try {
    const keyData = readFileSync('./serviceAccountKey.json', 'utf8');
    serviceAccount = JSON.parse(keyData);
    
    if (!serviceAccount || typeof serviceAccount !== 'object' || !serviceAccount.type) {
         throw new Error("Parsed service account key is not a valid JSON object.");
    }
} catch (error) {
    console.error("=========================================================================");
    console.error("FATAL ERROR: Failed to load Firebase service account key. 伺服器啟動失敗。");
    console.error("請檢查：1. serviceAccountKey.json 檔案是否在 /backend 資料夾。 2. 檔案內容是否為正確的 JSON 格式。");
    console.error(`原始錯誤: ${error.message}`);
    console.error("=========================================================================");
    process.exit(1); 
}

// ===============================================
// 🎯 使用環境變數的 OpenAI API 金鑰 (安全!)
// ===============================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("FATAL ERROR: OPENAI_API_KEY is not set in environment variables (.env file).");
    process.exit(1);
}

// 初始化 OpenAI
const openai = new OpenAI({ 
    apiKey: OPENAI_API_KEY,
});

// ⭐ 修正 2: 初始化 Firebase Admin - 必須使用命名空間 adminPkg 來呼叫方法 (解決 this 綁定和 cert 錯誤)
adminPkg.initializeApp({
  credential: adminPkg.credential.cert(serviceAccount) 
});

// ⭐ 修正 3: 初始化 Firestore - 使用最穩定的呼叫方式 adminPkg.firestore() (解決 getFirestore 不是 function 的問題)
const db = adminPkg.firestore(); 

const app = express();
const PORT = 3001; 

// 設置 CORS 和 JSON 處理
app.use(cors({ 
    origin: 'http://localhost:5173', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    credentials: true, 
    allowedHeaders: 'Content-Type,Authorization' 
}));
app.use(express.json());

// ===============================================
// 觀點 (st) 轉換為 OpenAI System Prompt 
// ===============================================
const getSystemPrompt = (st_group) => {
    const basePrompt = "你現在是一個台灣社會議題的討論參與者，請以中文進行回覆，保持禮貌和理性。你的每次回覆應在 50 個中文字以內。";
    let viewpoint = "";
    if (st_group === 1) viewpoint = "你的核心觀點是：強烈支持保留博愛座，因為它具有提醒公眾關懷弱勢的功能。";
    else if (st_group === 0) viewpoint = "你的核心觀點是：強烈反對保留博愛座，認為它造成道德綁架，應自發讓座，主張廢除。";
    else if (st_group === 2) viewpoint = "你的核心觀點是：以中立且平衡的態度，同時理解支持與反對保留博愛座雙方的論點，不選邊站。";
    else viewpoint = "你對此議題保持中立。";
    return `${basePrompt} ${viewpoint}`
};


// ===============================================
// 🚀 路由 1: 處理聊天訊息的 API (/api/chat/reply)
// ===============================================
app.post('/api/chat/reply', async (req, res) => { 
    try {
        // 修正路由名稱以符合前端
        const { messages, contentC, groupN } = req.body;
        
        const systemPrompt = getSystemPrompt(contentC); 
        
        let modelMessages = [ { role: "system", content: systemPrompt } ];
        
        if (groupN === 0) { // N=0 是 AI 
             modelMessages[0].content += " 在回覆中，請暗示或直接提到自己是一個 AI 模型，例如：'作為一個語言模型...'";
        }
        
        // 合併歷史訊息
        modelMessages = modelMessages.concat(
            messages.map(msg => ({ 
                role: msg.sender === 'You' ? 'user' : 'assistant', // 轉換 sender 名稱
                content: msg.text 
            }))
        ); 
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: modelMessages,
            temperature: 0.7,
            max_tokens: 200, 
        });

        return res.status(200).json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('--- Error calling OpenAI API ---:', error.message);
        if (error.message.includes('401')) {
            return res.status(401).json({ message: 'OpenAI API 錯誤：金鑰無效或已過期 (401)。', error: error.message });
        }
        return res.status(500).json({ message: 'OpenAI API 錯誤。', error: error.message });
    }
});


// ===============================================
// 🚀 路由 2: 處理前測問卷提交 (/api/submit_pretest)
// ===============================================
app.post('/api/submit_pretest', async (req, res) => {
  try {
    const pretestData = req.body;
    await db.collection('pretests').add(pretestData); 
    return res.status(200).json({ message: 'Pretest data submitted successfully!' });
  } catch (error) {
    console.error('--- Error submitting pretest data ---:', error);
    return res.status(500).json({ message: 'Server error during data submission.', error: error.message });
  }
});


// ===============================================
// 🚀 路由 3: 處理所有後測數據 (/api/submit_posttest)
// ===============================================
app.post('/api/submit_posttest', async (req, res) => {
  try {
    const posttestData = req.body;
    await db.collection('posttests').add(posttestData); 
    return res.status(200).json({ message: 'Posttest data submitted successfully!' });
  } catch (error) {
    console.error('--- Error submitting posttest data ---:', error);
    return res.status(500).json({ message: 'Server error during posttest submission.', error: error.message });
  }
});


// ===============================================
// 捕獲所有未找到的路由 (404 錯誤處理)
// ===============================================
app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `無法找到路徑: ${req.originalUrl}. 請檢查您的前端請求路徑與後端定義是否匹配。`,
        available_endpoints: ['/api/chat/reply', '/api/submit_pretest', '/api/submit_posttest']
    });
});


// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`   API 聊天端點: http://localhost:${PORT}/api/chat/reply`);
});