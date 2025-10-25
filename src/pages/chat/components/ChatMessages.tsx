import React from 'react';
import { Box, Typography } from '@mui/material';
import { MessageBubble, Message } from './MessageBubble';

interface ChatMessagesProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  messagesEndRef,
}) => (
  <Box 
    sx={{ 
      flex: 1, 
      overflow: 'auto', 
      p: 3,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {messages.length === 0 ? (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        flexDirection: 'column',
        textAlign: 'center'
      }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: '#CC785C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
            C
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#1a1a1a' }}>
          Welcome to Agent for Desktop
        </Typography>
        <Typography variant="body1" sx={{ color: 'grey.600', maxWidth: 400 }}>
          Start a conversation with Agent for Desktop to get help with your development tasks. 
          Ask questions, request code reviews, or get assistance with debugging.
        </Typography>
      </Box>
    ) : (
      messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))
    )}
    <div ref={messagesEndRef} />
  </Box>
);