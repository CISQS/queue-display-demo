import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { startFirebaseSync } from "./queue/firebaseSync";
import { startDailyResetWatcher } from "./queue/dailyReset";

startFirebaseSync();
startDailyResetWatcher();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
