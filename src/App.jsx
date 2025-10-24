import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ConfigProvider } from './contexts/ConfigContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e07b39',
    },
    background: {
      default: '#1e1e1e',
      paper: '#252525',
    },
    text: {
      primary: '#cccccc',
      secondary: '#999999',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConfigProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </Router>
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
