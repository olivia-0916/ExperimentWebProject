import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- 樣式與常數定義 ---
const PRIMARY_BLUE = '#007bff';
const DARK_TEXT = '#333';
const LIGHT_GRAY = '#eee';
const DISABLED_BG = '#ccc'; // 統一禁用按鈕顏色

// 知情同意書的完整文字內容
const CONSENT_TEXT = [
    { type: 'paragraph', content: '您好，我們是國立政治大學傳播學院碩士班的翁基紘與劉沐恩，本研究為一項結合社會議題與AI互動的線上實驗。' },
    { type: 'heading', content: '一、研究目的' },
    { type: 'paragraph', content: '本研究主要關注人們在接觸不同類型訊息後所產生的整體感受與反應。透過線上實驗與問卷了解參與者對互動經驗的主觀看法。研究所得資料將作為後續相關研究、互動系統設計與應用發展的參考，有助於理解不同使用情境下可能產生的效果與感受。' },
    { type: 'heading', content: '二、研究參與者之人數與參與限制' },
    { type: 'paragraph', content: '本研究預計招募約180位參與者，主要對象包含18歲以上大學生、碩士生與社會人士。參與者須具中文閱讀能力，無特定背景限制。未涉及限制行為能力或無行為能力者。' },
    { type: 'heading', content: '三、研究流程與所需時間' },
    { type: 'list', items: [
        '您將觀看一段社會議題的論述，接著簡短作答（約2分鐘）',
        '接著觀看某人對該論點的敘述，並簡短作答（約2分鐘）',
        '隨機與另一位參與者進行討論（約3-5分鐘）',
        '填寫問卷 （約6分鐘）',
    ]},
    { type: 'heading', content: '四、研究益處' },
    { type: 'subheading', content: '（一）對參與者個人之補償：' },
    { type: 'paragraph', content: '為感謝您參與本實驗，前180名完整填答的實驗者皆可獲得新台幣等值禮券作為時間補償。研究團隊會依系統結果安排的實驗內容，根據實際參與的階段，酬勞亦會有所差異。若符合條件並完整參與實驗，將獲得 50 元禮券；若未符合參與條件，則不另提供酬勞。惟為確保研究資料品質，研究團隊將於實驗結束後進行回應內容之審查，確認填答態度符合研究要求後，方予以發放獎勵。' },
    { type: 'subheading', content: '（二）對社會之益處：' },
    { type: 'paragraph', content: '本研究有助於深入理解如何更謹慎的設計人工智慧語言模型，以及討論人工智慧語言模型對社會產生正向效益之潛能，研究成果可作為未來 AI 系統設計與倫理規範發展之參考依據，進而提升科技應用之公共利益與社會責任。' },
    { type: 'heading', content: '五、研究潛在風險' },
    { type: 'paragraph', content: '本研究無生理或心理上的風險。互動內容與問卷皆為日常情境模擬，無包含激起強烈負面觀感之素材，填答過程亦不涉及個人隱私問題。' },
    { type: 'heading', content: '六、風險保護與補償' },
    { type: 'paragraph', content: '研究將依照倫理規範執行。若研究參與者於研究中遭遇任何不適，得隨時停止參與，無需說明原因，亦不會產生任何不良後果。若因參與本研究導致可歸責之損害，將由國立政治大學或計畫主持人依法負補償責任。' },
    { type: 'heading', content: '七、機密性與個人資料保護' },
    { type: 'paragraph', content: '您所提供的資料將以匿名方式編碼處理，所有結果僅供統計分析與學術使用，不會包含任何可識別個人資訊。資料將由研究人員保管，未經您同意不會轉作他用。' },
    { type: 'heading', content: '八、研究資料保存與處理' },
    { type: 'paragraph', content: '本研究所蒐集之資料（如問卷回覆）將保存至計畫結束後3年，並儲存於具安全防護之設備中。資料僅供本研究團隊使用，到期後將予以刪除或銷毀。' },
    { type: 'heading', content: '九、研究參與者權利' },
    { type: 'paragraph', content: '本研究已通過國立政治大學人類研究倫理審查委員會審查。若對研究有任何疑問，您可聯絡研究團隊，亦可致電政大研究倫理辦公室：(02)2939-3091 分機 66015。' },
    { type: 'paragraph', content: '您可隨時退出本研究，無需負擔任何責任。退出研究不會對您產生任何不利影響。' },
    { type: 'paragraph', content: '本研究不涉及商業用途，亦不會產生與您相關之商業利益。' },
];

// 內容渲染函數
const renderContent = (item, index) => {
    switch (item.type) {
        case 'heading':
            return <h2 key={index} style={styles.heading}>{item.content}</h2>;
        case 'subheading':
            return <h3 key={index} style={styles.subheading}>{item.content}</h3>;
        case 'paragraph':
            return <p key={index} style={styles.paragraph}>{item.content}</p>;
        case 'list':
            return (
                <ul key={index} style={styles.list}>
                    {item.items.map((listItem, i) => (
                        <li key={i} style={styles.listItem}>{listItem}</li>
                    ))}
                </ul>
            );
        default:
            return null;
    }
};

// 樣式定義
const styles = {
    container: {
        maxWidth: '850px',
        margin: '0 auto',
        padding: '30px', 
        backgroundColor: 'white', 
        color: DARK_TEXT,
        minHeight: '100vh',
    },
    mainHeader: {
        textAlign: 'center',
        marginBottom: '20px',
        color: PRIMARY_BLUE,
        fontSize: '2em',
    },
    consentBox: {
        padding: '25px',
        border: `1px solid ${LIGHT_GRAY}`,
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '30px',
        textAlign: 'left',
    },
    heading: {
        fontSize: '1.4em',
        marginTop: '25px',
        marginBottom: '10px',
        color: PRIMARY_BLUE,
        borderBottom: `2px solid ${LIGHT_GRAY}`,
        paddingBottom: '5px',
        fontWeight: 'bold',
    },
    subheading: {
        fontSize: '1.1em',
        marginTop: '15px',
        marginBottom: '8px',
        color: DARK_TEXT,
        fontWeight: 'bold',
    },
    paragraph: {
        fontSize: '1em',
        lineHeight: '1.6',
        marginBottom: '15px',
    },
    list: {
        marginLeft: '20px',
        paddingLeft: '0',
        marginBottom: '15px',
    },
    listItem: {
        marginBottom: '5px',
        fontSize: '1em',
    },
    consentCheckContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 'white',
        border: `1px solid ${PRIMARY_BLUE}`,
        borderRadius: '4px',
    },
    checkbox: {
        width: '20px',
        height: '20px',
        minWidth: '20px',
        marginRight: '10px',
        accentColor: PRIMARY_BLUE, 
    },
    checkboxLabel: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        lineHeight: '1.5',
        cursor: 'pointer',
    },
    submitButton: {
        width: '100%',
        padding: '15px',
        fontSize: '1.2em',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        transition: 'background-color 0.3s, opacity 0.3s',
        fontWeight: 'bold',
    }
};


export default function ConsentPage() {
    const navigate = useNavigate();
    const [isConsentChecked, setIsConsentChecked] = useState(false);
    
    // 💡 優化：將錯誤提示從 alert 改為狀態控制的訊息，以提升使用者體驗
    const [error, setError] = useState('');

    const handleProceed = () => {
        setError(''); // 點擊時先清除舊錯誤
        
        if (!isConsentChecked) {
            // 💡 將 alert 改為在頁面上顯示錯誤訊息
            setError('請務必閱讀並勾選「線上確認與同意聲明」才能進入實驗。');
            return; 
        }
        
        // ⚠️ 關鍵：資料紀錄點
        // 這裡通常需要**呼叫後端**紀錄 "已同意" 的狀態，
        // 並且**取得**分配給該使用者的實驗組別（n=0/1, s=0/1）。
        // 由於我們目前不知道後端如何傳資料，先假設資料紀錄成功後導航。

        // 導航到前測問卷頁面，並在 URL 帶上必要參數或依賴狀態管理來決定下一頁的內容
        navigate('/pretest-page'); 
    };

    return (
        <div className="page-content" style={styles.container}>
            <h1 style={styles.mainHeader}>知情同意書</h1>
            
            <div style={styles.consentBox}>
                {/* 渲染所有文字內容 */}
                {CONSENT_TEXT.map(renderContent)}
                
                <h2 style={styles.heading}>十、線上確認與同意聲明（參與前須勾選）</h2>
                
                <div style={styles.consentCheckContainer}>
                    <input 
                        type="checkbox" 
                        id="consent-checkbox" 
                        checked={isConsentChecked}
                        onChange={() => {
                            setIsConsentChecked(!isConsentChecked);
                            setError(''); // 勾選時清除錯誤訊息
                        }}
                        style={styles.checkbox}
                    />
                    <label htmlFor="consent-checkbox" style={styles.checkboxLabel}>
                        本人已閱讀並了解上述資訊，並同意自願參與本研究。本人知悉可隨時退出研究，且研究將保護我的個人資料與隱私。
                    </label>
                </div>

                {/* 💡 錯誤訊息顯示區塊 */}
                {error && (
                    <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>
                )}
            </div>

            <button 
                onClick={handleProceed} 
                disabled={!isConsentChecked}
                style={{
                    ...styles.submitButton,
                    backgroundColor: isConsentChecked ? PRIMARY_BLUE : DISABLED_BG,
                    cursor: isConsentChecked ? 'pointer' : 'not-allowed',
                }}
            >
                {isConsentChecked ? '我同意並開始實驗' : '請勾選同意聲明'}
            </button>
            
        </div>
    );
}