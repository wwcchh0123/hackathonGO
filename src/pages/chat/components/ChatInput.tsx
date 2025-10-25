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
    elevation={0} 
    sx={{ 
      p: 2,
      borderTop: '1px solid',
      borderColor: 'grey.200',
      borderRadius: 0,
      display: 'flex', 
      alignItems: 'flex-end',
      gap: 2
    }}
  >
    <TextField
      fullWidth
      multiline
      maxRows={4}
      placeholder={isLoading ? "Processing..." : "Ask Agent for Desktop anything..."}
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
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          borderColor: 'grey.300',
          '&:hover fieldset': { borderColor: '#CC785C' },
          '&.Mui-focused fieldset': { borderColor: '#CC785C' },
          '& fieldset': { borderWidth: '1px' }
        }
      }}
    />
    <IconButton 
      onClick={onSendMessage}
      disabled={!inputText.trim() || isLoading}
      sx={{ 
        bgcolor: '#CC785C',
        color: 'white',
        width: 40,
        height: 40,
        '&:hover': { bgcolor: '#B5694A' },
        '&:disabled': { 
          bgcolor: 'grey.300',
          color: 'grey.500'
        }
      }}
    >
      <SendIcon fontSize="small" />
    </IconButton>
  </Paper>
);