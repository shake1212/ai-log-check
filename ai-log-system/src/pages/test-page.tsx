import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'red', fontSize: '24px' }}>测试页面</h1>
      <p>如果你能看到这个页面，说明基本渲染是正常的。</p>
      <div style={{ 
        width: '200px', 
        height: '100px', 
        background: 'blue', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '20px 0'
      }}>
        蓝色测试块
      </div>
      <button 
        onClick={() => alert('按钮点击成功！')}
        style={{ 
          padding: '10px 20px', 
          background: 'green', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        点击测试按钮
      </button>
    </div>
  );
};

export default TestPage;
