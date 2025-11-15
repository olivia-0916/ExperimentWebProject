// /frontend/src/main.jsx (最終穩定版 - 修正 Discussion Page 路由 & 新增 Attention Check, Demographics & Email)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx'; 
import './index.css';

// ===============================================
// 🚀 匯入所有的頁面元件
// ===============================================
import ConsentPage from './pages/ConsentPage.jsx';               
import PretestPage from './pages/PretestPage.jsx';               
import StimulusPage from './pages/StimulusPage.jsx';             
import DiscussionIntroPage from "./pages/DiscussionIntroPage.jsx";

// ⭐ 新增匯入 MatchingAnimationPage 組件 (用於人類夥伴匹配延遲)
import MatchingAnimationPage from './pages/MatchingAnimationPage.jsx'; 

import DiscussionAllocationPage from './pages/DiscussionAllocationPage.jsx'; 

// ⭐ 匯入新的 AttentionManipulationCheck 組件
import AttentionManipulationCheck from './pages/AttentionManipulationCheck.jsx'; 

// 實際的討論頁面
import DiscussionPage from './pages/DiscussionPage.jsx';
import ExperimentPage from './pages/ExperimentPage.jsx';         

import PosttestPage from './pages/PosttestPage.jsx';             
import NeutralEndPage from './pages/NeutralEndPage.jsx';         

// 後測問卷三部曲
import PosttestQuestionnaire from './pages/PosttestQuestionnaire.jsx'; 
import DemographicsPage from './pages/DemographicsPage.jsx';           
// ⭐ 新增匯入 Email 頁面
import EmailCollectionPage from './pages/EmailCollectionPage.jsx';
import CompletePage from './pages/CompletePage.jsx';             


// ===============================================
// 🚀 定義所有實驗流程路徑
// ===============================================
const router = createBrowserRouter([
  {
    element: <App />, 
    children: [
      // 🎯 實驗流程 第一步：知情同意書
      { path: '/', element: <ConsentPage /> }, 
      
      // 階段一：前測
      { path: '/pretest-page', element: <PretestPage /> },       
      
      // 階段二：刺激物觀看與問卷
      { path: '/stimulus-page', element: <StimulusPage /> },       
      
      // 階段二：討論說明頁 (根據分組決定下一步)
      { path: '/discussion-intro', element: <DiscussionIntroPage /> }, 

      // ⭐ 新增：人類夥伴匹配動畫頁面
      { path: '/matching-animation', element: <MatchingAnimationPage /> },
      
      // 階段二：討論夥伴分配與連線頁面 (可能是從 Intro 或 Matching 動畫頁面跳轉過來)
      { path: '/discussion-allocation', element: <DiscussionAllocationPage /> }, 
      
      // 階段二：實驗開始與分組 (此頁位置可能需要調整，但暫時保留)
      { path: '/experiment-page', element: <ExperimentPage /> },
      
      // 階段三：實際討論聊天室
      { path: '/discussion-page', element: <DiscussionPage /> }, 
      
      // 討論結束後，進入注意力與操弄檢定
      { path: '/attention-check', element: <AttentionManipulationCheck /> },
      
      // 階段四：後測問卷 (三步執行)
      { path: '/posttest-questionnaire', element: <PosttestQuestionnaire /> }, 
      { path: '/demographics-page', element: <DemographicsPage /> },  
      
      // ⭐ 新增 Email 收集頁面的路徑
      { path: '/email-collection-page', element: <EmailCollectionPage /> },
      
      // 階段五：結束畫面
      { path: '/neutral-end-page', element: <NeutralEndPage /> }, 
      { path: '/complete-page', element: <CompletePage /> },       
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);