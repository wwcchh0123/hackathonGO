import React from 'react';
import { Box, Paper, Typography, Card, CardMedia, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'
import { MarkdownContent } from '../../../components/MarkdownContent'
import { MessageActions } from './MessageActions'
import { Code, Image as ImageIcon, Build } from '@mui/icons-material';

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

const renderToolResults = (toolResults: ToolResult[]) => {
  if (!toolResults || toolResults.length === 0) return null;

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {toolResults.map((tool) => (
        <Paper
          key={tool.id}
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: tool.status === 'success' ? '#f8fff8' : 
                     tool.status === 'error' ? '#fff8f8' : '#f8f8ff',
            borderColor: tool.status === 'success' ? '#4caf50' :
                        tool.status === 'error' ? '#f44336' : '#2196f3'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Build 
              fontSize="small" 
              color={tool.status === 'success' ? 'success' : 
                     tool.status === 'error' ? 'error' : 'primary'}
            />
            <Typography variant="subtitle2" fontWeight={600}>
              {tool.name}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                bgcolor: tool.status === 'success' ? '#4caf50' :
                        tool.status === 'error' ? '#f44336' : '#2196f3',
                color: 'white',
                px: 1,
                py: 0.25,
                borderRadius: 0.5,
                textTransform: 'uppercase',
                fontSize: '10px'
              }}
            >
              {tool.status}
            </Typography>
          </Box>
          
          {tool.output && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                输出:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'SFMono-Regular, Consolas, monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  bgcolor: '#f5f5f5',
                  p: 1,
                  borderRadius: 0.5,
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                {tool.output}
              </Typography>
            </Box>
          )}
          
          {tool.error && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={500} color="error" gutterBottom>
                错误:
              </Typography>
              <Typography
                variant="body2"
                color="error"
                sx={{
                  fontFamily: 'SFMono-Regular, Consolas, monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  bgcolor: '#fff5f5',
                  p: 1,
                  borderRadius: 0.5
                }}
              >
                {tool.error}
              </Typography>
            </Box>
          )}
          
          {tool.metadata && Object.keys(tool.metadata).length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                元数据:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'SFMono-Regular, Consolas, monospace',
                  fontSize: '11px',
                  color: 'text.secondary'
                }}
              >
                {JSON.stringify(tool.metadata, null, 2)}
              </Typography>
            </Box>
          )}
        </Paper>
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
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
            p: 2,
            pt: 1,
            pb: 6,
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
            position: 'relative'
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
              border: '1px solid #e1e4e8',
              padding: '0.2em 0.4em'
            }
          }}>
            <MarkdownContent content={message.content} />
          </Box>
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

          {/* 左下角操作按钮 */}
          <MessageActions 
            content={message.content}
            isUser={isUser}
            onPrefillInput={onPrefillInput}
          />
        </Box>
        
        {/* 渲染图片附件 */}
        {renderImages(message.images || [])}
        
        {/* 渲染工具执行结果 */}
        {renderToolResults(message.toolResults || [])}
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
