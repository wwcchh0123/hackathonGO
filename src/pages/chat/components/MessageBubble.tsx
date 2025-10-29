import React from 'react';
import { Box, Typography, Card, CardMedia } from '@mui/material';
import { MarkdownContent } from '../../../components/MarkdownContent'

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[];
  toolResults?: ToolResult[];
}

export interface ToolResult {
  id: string;
  name: string;
  status: 'success' | 'error' | 'pending';
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

interface MessageBubbleProps {
  message: Message;
  onPrefillInput?: (text: string) => void;
}

const renderImages = (images: string[]) => {
  if (!images || images.length === 0) return null;

  return (
    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {images.map((image, index) => (
        <Card key={index} sx={{ maxWidth: 200, borderRadius: 1 }}>
          <CardMedia
            component="img"
            src={image}
            alt={`Attachment ${index + 1}`}
            sx={{
              maxHeight: 150,
              objectFit: 'cover',
              cursor: 'pointer'
            }}
            onClick={() => window.open(image, '_blank')}
          />
        </Card>
      ))}
    </Box>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onPrefillInput }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
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
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 0,
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
            border: 'none',
          }}
        >
          <Box sx={{
            '& code': {
              fontFamily: 'SFMono-Regular, Consolas, monospace',
              fontSize: '12px',
              display: 'inline',
              bgcolor: '#f6f8fa',
              color: '#24292e',
              borderRadius: '4px',
              border: 'none',
              padding: '0.2em 0.4em'
            }
          }}>
            <MarkdownContent content={message.content} />
          </Box>
        </Box>
        
        {/* 渲染图片附件 */}
        {renderImages(message.images || [])}
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
