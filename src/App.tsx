import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { Goals } from './pages/Goals';
import { Investments } from './pages/Investments';
import { Comparisons } from './pages/Comparisons';
import { Settings } from './pages/Settings';
import { ToastProvider } from './components/ui/toast';
import { useThemeStore } from './store/themeStore';

function App() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className={`${theme} flex min-h-screen bg-background text-foreground`}>
          <Navigation />
          <main className="flex-1 flex overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/comparisons" element={<Comparisons />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
