import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionTreeViewer } from '../../src/viewer/DecisionTreeViewer';
import '../../src/shared/base.css';

// Loads decision.json from the folder this page is served from.
// An optional ?lang=hu|de|en picks the starting language (otherwise: browser preference, then English).
const language = new URLSearchParams(window.location.search).get('lang') ?? undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecisionTreeViewer language={language} />
  </StrictMode>,
);
