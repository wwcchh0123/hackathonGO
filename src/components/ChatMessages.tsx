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
      p: 1,
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
        opacity: 0.6
      }}>
        <Typography variant="h6" gutterBottom>
          Welcome to Claude Code Desktop
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Type your message below to start chatting with Claude Code!
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