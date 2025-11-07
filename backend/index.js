// backend/index.js

// 引入 Express 框架來建立 API 伺服器
const express = require('express');
const app = express();

// 引入 Firebase Admin SDK 進行資料庫操作
const admin = require('firebase-admin');

// 引入 CORS (跨域資源共享)，允許前端 React 網站存取這個後端
const cors = require('cors');

// --- 設定區塊 ---
// 讀取服務帳號金鑰 (請確保這個檔案 serviceAccountKey.json 已經上傳到 backend 資料夾)
const serviceAccount = require('./serviceAccountKey.json'); 
const PORT = process.env.PORT || 3001; // 設定伺服器埠號

// 初始化 Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 取得 Firestore 資料庫參考
const db = admin.firestore();

// --- 中介軟體 (Middleware) ---
// 允許所有來源 (CORS) 存取
app.use(cors()); 

// 讓 Express 可以讀取 JSON 格式的請求
app.use(express.json()); 


// -------------------------------------------------------------------
// --- API 路由定義 1: 測試連線 ---
// 瀏覽器訪問 /api/status 會返回狀態訊息
app.get('/api/status', (req, res) => {
  res.status(200).json({
    message: 'Backend API is running and connected to Firebase.',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------------
// --- API 路由定義 2: 接收前測問卷並分組 (核心功能) ---
app.post('/api/submit_pretest', async (req, res) => {
  try {
    const pretestData = req.body; 
    const userId = pretestData.userId || Date.now().toString(); 

    // TODO: 實作計算分數和分組的邏輯 (這部分我們之後再回來寫)
    let assignmentGroup = 'Control'; // 預設為 Control

    // 儲存資料到 Firestore
    const dataToSave = {
      ...pretestData, 
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      assignmentGroup: assignmentGroup, 
    };

    await db.collection('experimental_data').doc(userId).set(dataToSave);

    // 回傳給前端成功訊息和分組結果
    res.status(200).json({
      message: 'Pretest data saved successfully.',
      userId: userId,
      group: assignmentGroup 
    });

  } catch (error) {
    console.error('Error submitting pretest data:', error);
    res.status(500).json({
      message: 'Server error during data submission.',
      error: error.message
    });
  }
});


// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});