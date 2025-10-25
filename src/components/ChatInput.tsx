import React from 'react';
import { Paper, TextField, IconButton } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputProps {
  inputText: string;
  setInputText: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
}) => (
  <Paper 
    elevation={2} 
    sx={{ 
      p: 1, 
      mt: 1,
      display: 'flex', 
      alignItems: 'flex-end',
      gap: 1
    }}
  >
    <TextField
      fullWidth
      multiline
      maxRows={4}
      placeholder={isLoading ? "Processing..." : "Type your message to Claude Code..."}
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSendMessage();
        }
      }}
      disabled={isLoading}
      variant="outlined"
      size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        }
      }}
    />
    <IconButton 
      onClick={onSendMessage}
      disabled={!inputText.trim() || isLoading}
      color="primary"
      sx={{ 
        bgcolor: 'primary.main',
        color: 'white',
        '&:hover': { bgcolor: 'primary.dark' },
        '&:disabled': { bgcolor: 'action.disabled' }
      }}
    >
      <SendIcon />
    </IconButton>
  </Paper>
);