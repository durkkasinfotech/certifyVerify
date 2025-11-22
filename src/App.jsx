import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import SuperAdminLogin from './pages/SuperAdminLogin.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';
import Verify from './pages/Verify.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Verify />} />
        <Route path="/verify/*" element={<Verify />} />
        <Route path="/login" element={<Login />} />
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdmin />
            </SuperAdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
