import React from 'react';
import { Box, Typography } from '@mui/material';
import appIcon from '../../../assets/icon.png'
import { MessageBubble, Message } from './MessageBubble';

interface ChatMessagesProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onPrefillInput: (text: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  messagesEndRef,
  onPrefillInput,
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
          component="img"
          src={appIcon}
          alt="App Icon"
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            mb: 3,
          }}
        />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#1a1a1a' }}>
          Welcome to XGopilot for Desktop
        </Typography>
        <Typography variant="body1" sx={{ color: 'grey.600', maxWidth: 400 }}>
          Start a conversation with XGopilot for Desktop to get help with your development tasks. 
          Ask questions, request code reviews, or get assistance with debugging.
        </Typography>
      </Box>
    ) : (
      messages.map((message) => (
        <MessageBubble key={message.id} message={message} onPrefillInput={onPrefillInput} />
      ))
    )}
    <div ref={messagesEndRef} />
  </Box>
);
