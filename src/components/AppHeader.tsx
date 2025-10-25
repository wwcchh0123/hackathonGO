import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface AppHeaderProps {
  currentPage: 'chat' | 'settings';
  onNavigateToSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentPage,
  onNavigateToSettings,
}) => (
  <AppBar 
    position="static" 
    elevation={0} 
    sx={{ 
      bgcolor: 'white',
      borderBottom: '1px solid',
      borderColor: 'grey.200',
      color: '#1a1a1a'
    }}
  >
    <Toolbar sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: '#CC785C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
            C
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
          Claude Code
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