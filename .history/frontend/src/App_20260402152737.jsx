import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
      </Routes>

      <Toaster
        position='top-right'
        toastOptions={{
          style: {
            border: '1px solid #264a67',
            color: '#123047',
            background: '#f8fbfd',
            fontFamily: 'Montserrat, Calibri, sans-serif',
            boxShadow: '0 10px 20px rgba(29, 58, 81, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#ff6600',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </BrowserRouter>
  )
}
