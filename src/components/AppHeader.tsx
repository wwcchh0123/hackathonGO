import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface AppHeaderProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  showSettings,
  onToggleSettings,
}) => (
  <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Toolbar>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Claude Code Desktop
      </Typography>
      <IconButton 
        color="inherit" 
        onClick={onToggleSettings}
        size="small"
      >
        <SettingsIcon />
      </IconButton>
    </Toolbar>
  </AppBar>
);