import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import VendorRisk from './pages/VendorRisk';
import ReconciliationView from './pages/ReconciliationView';
import Upload from './pages/Upload';

function App() {
    return (
        <Router>
            <div className="flex min-h-screen bg-surface-950">
                {/* Sidebar */}
                <aside className="w-64 bg-surface-900/50 border-r border-white/5 backdrop-blur-xl flex flex-col py-6 px-4 fixed h-full z-10">
                    <div className="mb-8 px-2">
                        <h1 className="text-xl font-bold gradient-text">GST Recon</h1>
                        <p className="text-xs text-slate-500 mt-1">Knowledge Graph Engine</p>
                    </div>

                    <nav className="flex flex-col gap-1 flex-1">
                        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                        </NavLink>

                        <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Upload Bills
                        </NavLink>

                        <NavLink to="/reconciliation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Reconciliation
                        </NavLink>

                        <NavLink to="/vendor-risk" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Vendor Risk
                        </NavLink>
                    </nav>

                    <div className="px-2 py-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="pulse-dot bg-emerald-400"></div>
                            <span className="text-xs text-slate-400">Engine Active</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 ml-64 p-8">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/reconciliation" element={<ReconciliationView />} />
                        <Route path="/vendor-risk" element={<VendorRisk />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
