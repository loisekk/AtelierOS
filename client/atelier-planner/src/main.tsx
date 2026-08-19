import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App'; // UPDATED PATH
import './styles/index.css'; // UPDATED PATH

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);