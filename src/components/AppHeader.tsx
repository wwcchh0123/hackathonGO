import React from 'react';
import { AppBar, Toolbar, Typography, Chip, IconButton } from '@mui/material';
import { Settings as SettingsIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';

interface AppHeaderProps {
  running: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  onRunStop: () => void;
  hasCommand: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  running,
  showSettings,
  onToggleSettings,
  onRunStop,
  hasCommand,
}) => (
  <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Toolbar>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Claude Code Desktop
      </Typography>
      <Chip 
        label={running ? 'Running' : 'Stopped'} 
        color={running ? 'success' : 'default'} 
        size="small" 
        sx={{ mr: 1 }}
      />
      <IconButton 
        color="inherit" 
        onClick={onToggleSettings}
        size="small"
      >
        <SettingsIcon />
      </IconButton>
      <IconButton 
        color="inherit" 
        onClick={onRunStop}
        disabled={!hasCommand}
        size="small"
      >
        {running ? <StopIcon /> : <PlayIcon />}
      </IconButton>
    </Toolbar>
  </AppBar>
);