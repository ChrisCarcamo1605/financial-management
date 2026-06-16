import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import FuentesIngreso from './pages/FuentesIngreso';
import Prestamos from './pages/Prestamos';
import Quincenas from './pages/Quincenas';
import Servicios from './pages/Servicios';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">
              <Routes>
                {/* Public */}
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected */}
                <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/transactions"   element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/accounts"       element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                <Route path="/categories"     element={<ProtectedRoute><Categories /></ProtectedRoute>} />
                <Route path="/budgets"        element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                <Route path="/reports"        element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/analytics"      element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/fuentes-ingreso" element={<ProtectedRoute><FuentesIngreso /></ProtectedRoute>} />
                <Route path="/prestamos"      element={<ProtectedRoute><Prestamos /></ProtectedRoute>} />
                <Route path="/servicios"      element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
                <Route path="/quincenas"      element={<ProtectedRoute><Quincenas /></ProtectedRoute>} />

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
