import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Stack, 
  TextField, 
  Button, 
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, FolderOpen as FolderOpenIcon } from '@mui/icons-material';

interface SettingsPageProps {
  command: string;
  setCommand: (value: string) => void;
  cwd: string;
  setCwd: (value: string) => void;
  envText: string;
  setEnvText: (value: string) => void;
  onPickCwd: () => void;
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  command,
  setCommand,
  cwd,
  setCwd,
  envText,
  setEnvText,
  onPickCwd,
  onBack,
}) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid', 
        borderColor: 'grey.200',
        py: 2
      }}>
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={onBack} sx={{ color: '#CC785C' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              Settings
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* CLI Configuration */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
              CLI Configuration
            </Typography>
            <Stack spacing={3}>
              <TextField 
                label="Command" 
                placeholder="claude" 
                value={command} 
                onChange={(e) => setCommand(e.target.value)} 
                fullWidth 
                variant="outlined"
                helperText="CLI command to execute (e.g., claude)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#CC785C' },
                    '&.Mui-focused fieldset': { borderColor: '#CC785C' }
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#CC785C' }
                }}
              />
            </Stack>
          </Paper>

          {/* Environment */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
              Environment
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'grey.700' }}>
                  Working Directory
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField 
                    placeholder="Optional working directory" 
                    value={cwd} 
                    onChange={(e) => setCwd(e.target.value)} 
                    fullWidth 
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#CC785C' },
                        '&.Mui-focused fieldset': { borderColor: '#CC785C' }
                      }
                    }}
                  />
                  <Button 
                    onClick={onPickCwd} 
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    sx={{ 
                      borderColor: '#CC785C',
                      color: '#CC785C',
                      '&:hover': {
                        borderColor: '#B5694A',
                        bgcolor: '#CC785C0A'
                      }
                    }}
                  >
                    Browse
                  </Button>
                </Stack>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'grey.700' }}>
                    Environment Variables
                  </Typography>
                  <Button 
                    size="small"
                    onClick={() => {
                      const template = `# API Configuration
ANTHROPIC_API_KEY=your-api-key-here

# Optional: Custom base URL (if using proxy/gateway)
# ANTHROPIC_BASE_URL=https://api.anthropic.com

# Optional: Model preferences
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# ANTHROPIC_DEFAULT_SONNET_MODEL=claude-3-5-sonnet-20241022
# ANTHROPIC_DEFAULT_OPUS_MODEL=claude-3-opus-20240229
# ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-3-haiku-20240307

# Other environment variables...`;
                      setEnvText(template);
                    }}
                    sx={{ 
                      fontSize: '0.75rem',
                      color: '#CC785C',
                      '&:hover': {
                        bgcolor: '#CC785C0A'
                      }
                    }}
                  >
                    Use Template
                  </Button>
                </Box>
                <TextField 
                  placeholder="KEY=VALUE (one per line)" 
                  value={envText} 
                  onChange={(e) => setEnvText(e.target.value)} 
                  fullWidth 
                  multiline 
                  rows={8}
                  variant="outlined"
                  helperText="Configure API keys, base URLs, and model preferences"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      '&:hover fieldset': { borderColor: '#CC785C' },
                      '&.Mui-focused fieldset': { borderColor: '#CC785C' }
                    },
                    '& .MuiFormHelperText-root': {
                      color: 'grey.600'
                    }
                  }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* About */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
              About
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'grey.700' }}>
                  Claude Code Desktop
                </Typography>
                <Typography variant="body2" sx={{ color: 'grey.500' }}>
                  Electron wrapper for Claude Code CLI
                </Typography>
              </Box>
              <Divider />
              <Typography variant="body2" sx={{ color: 'grey.600' }}>
                Built with React, TypeScript, and Material-UI
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};