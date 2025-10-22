import React from 'react';

const DebugPage: React.FC = () => {
  console.log('DebugPage component is rendering');
  
  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      minHeight: '100vh',
      border: '2px solid red'
    }}>
      <h1 style={{ color: 'red', fontSize: '32px' }}>调试页面</h1>
      <p style={{ fontSize: '18px' }}>如果你能看到这个页面，说明路由和组件渲染都正常。</p>
      <div style={{ 
        width: '300px', 
        height: '150px', 
        background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '20px 0',
        borderRadius: '10px',
        fontSize: '20px',
        fontWeight: 'bold'
      }}>
        渐变测试块
      </div>
      <button 
        onClick={() => {
          alert('按钮点击成功！');
          console.log('Button clicked successfully');
        }}
        style={{ 
          padding: '15px 30px', 
          background: 'linear-gradient(45deg, #667eea, #764ba2)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        点击测试按钮
      </button>
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
        <p><strong>当前时间:</strong> {new Date().toLocaleString()}</p>
        <p><strong>页面路径:</strong> {window.location.pathname}</p>
        <p><strong>用户代理:</strong> {navigator.userAgent}</p>
      </div>
    </div>
  );
};

export default DebugPage;
