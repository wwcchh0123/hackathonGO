import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import appIcon from '../../assets/icon.png'
import { Settings as SettingsIcon, Menu as MenuIcon } from '@mui/icons-material';

interface AppHeaderProps {
  currentPage: 'chat' | 'settings';
  onNavigateToSettings: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentPage,
  onNavigateToSettings,
  onToggleSidebar,
  sidebarOpen = false,
}) => (
  <AppBar 
    position="static" 
    elevation={0} 
    sx={{ 
      bgcolor: 'white',
      borderBottom: 'none',
      color: '#1a1a1a'
    }}
  >
    <Toolbar sx={{ py: 1 }}>
      {currentPage === 'chat' && onToggleSidebar && (
        <IconButton 
          onClick={onToggleSidebar}
          size="small"
          sx={{ 
            mr: 2,
            color: '#CC785C',
            '&:hover': { bgcolor: '#CC785C0A' }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        <Box
          component="img"
          src={appIcon}
          alt="App Icon"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            mr: 2
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
          XGopilot for Desktop
        </Typography>
      </Box>
      
      {currentPage === 'chat' && (
        <IconButton 
          onClick={onNavigateToSettings}
          size="small"
          sx={{ 
            color: '#CC785C',
            '&:hover': { bgcolor: '#CC785C0A' }
          }}
        >
          <SettingsIcon />
        </IconButton>
      )}
    </Toolbar>
  </AppBar>
);
