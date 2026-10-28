import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionTreeViewer } from '../../src/viewer/DecisionTreeViewer';
import '../../src/shared/base.css';

// Loads decision.json from the folder this page is served from.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecisionTreeViewer />
  </StrictMode>,
);
