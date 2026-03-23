import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 작성하신 app.js를 불러옵니다.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
