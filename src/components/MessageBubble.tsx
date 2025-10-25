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
        mb: 3,
        alignItems: 'flex-start',
        gap: 2
      }}
    >
      {!isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: isSystem ? '#f5f5f5' : '#CC785C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: isSystem ? '#666' : 'white', 
              fontWeight: 600, 
              fontSize: '12px' 
            }}
          >
            {isSystem ? '!' : 'C'}
          </Typography>
        </Box>
      )}
      
      <Box
        sx={{
          maxWidth: '70%',
          p: 2,
          bgcolor: isUser 
            ? '#CC785C' 
            : isSystem 
              ? '#f8f9fa'
              : '#f5f5f5',
          color: isUser 
            ? 'white' 
            : isSystem 
              ? '#e74c3c'
              : '#1a1a1a',
          borderRadius: 2,
          border: isSystem ? '1px solid #fee' : 'none',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            fontFamily: isSystem ? 'SFMono-Regular, Consolas, monospace' : 'inherit',
            fontSize: isSystem ? '13px' : '14px',
            lineHeight: 1.5,
          }}
        >
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1,
            opacity: 0.7,
            fontSize: '11px',
          }}
        >
          {message.timestamp.toLocaleTimeString()}
        </Typography>
      </Box>
      
      {isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666', 
              fontWeight: 600, 
              fontSize: '12px' 
            }}
          >
            U
          </Typography>
        </Box>
      )}
    </Box>
  );
};