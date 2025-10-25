import React from 'react';
import { Paper, Typography, Stack, TextField, Button } from '@mui/material';

interface SettingsPanelProps {
  command: string;
  setCommand: (value: string) => void;
  argsText: string;
  setArgsText: (value: string) => void;
  cwd: string;
  setCwd: (value: string) => void;
  envText: string;
  setEnvText: (value: string) => void;
  onPickCwd: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  command,
  setCommand,
  argsText,
  setArgsText,
  cwd,
  setCwd,
  envText,
  setEnvText,
  onPickCwd,
}) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Typography variant="h6" gutterBottom>
      Settings
    </Typography>
    <Stack spacing={2}>
      <TextField 
        label="CLI command" 
        placeholder="e.g., claude-code" 
        value={command} 
        onChange={(e) => setCommand(e.target.value)} 
        fullWidth 
        size="small"
      />
      <TextField 
        label="Arguments" 
        placeholder="e.g., --interactive --mcp" 
        value={argsText} 
        onChange={(e) => setArgsText(e.target.value)} 
        fullWidth 
        size="small"
      />
      <Stack direction="row" spacing={1}>
        <TextField 
          label="Working directory" 
          placeholder="optional cwd" 
          value={cwd} 
          onChange={(e) => setCwd(e.target.value)} 
          fullWidth 
          size="small"
        />
        <Button onClick={onPickCwd} size="small">Browse</Button>
      </Stack>
      <TextField 
        label="Environment (KEY=VALUE per line)" 
        value={envText} 
        onChange={(e) => setEnvText(e.target.value)} 
        fullWidth 
        multiline 
        rows={2}
        size="small"
      />
    </Stack>
  </Paper>
);