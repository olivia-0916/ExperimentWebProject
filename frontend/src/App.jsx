// frontend/src/App.jsx (Layout Component)

import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// 我們的主要佈局元件 (取代原本的 App.jsx)
function App() {
  // 獲取當前的路徑，我們可以根據路徑顯示不同的內容
  const location = useLocation();

  // 確保每次換頁時，頁面都滾動到最上方
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="experiment-container">
      {/* Outlet 用於顯示當前路由匹配到的子元件 (例如 Consent, Pretest, etc.) */}
      <Outlet />
    </div>
  );
}

export default App;