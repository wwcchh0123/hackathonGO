import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          maxWidth: '70%',
          p: 1.5,
          bgcolor: isUser 
            ? 'primary.main' 
            : isSystem 
              ? 'action.hover'
              : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            fontFamily: isSystem ? 'monospace' : 'inherit',
            fontSize: isSystem ? '0.75rem' : '0.875rem',
          }}
        >
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.7,
            fontSize: '0.7rem',
          }}
        >
          {message.timestamp.toLocaleTimeString()}
        </Typography>
      </Paper>
    </Box>
  );
};