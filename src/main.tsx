import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TolkflowProvider } from './context/TolkflowContext';
import '../index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TolkflowProvider>
        <App />
      </TolkflowProvider>
    </React.StrictMode>
  );
}
