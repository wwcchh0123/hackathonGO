import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardMedia,
  Collapse,
  IconButton,
  Chip
} from '@mui/material';
import {
  Code,
  Image as ImageIcon,
  Build,
  ExpandMore as ExpandMoreIcon,
  Psychology as ThinkingIcon,
  PlayArrow as RunningIcon
} from '@mui/icons-material';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[];
  toolResults?: ToolResult[];
  toolCalls?: ToolCall[];  // 添加工具调用信息
  thinking?: string;        // 添加思考过程
}

export interface ToolResult {
  id: string;
  name: string;
  status: 'success' | 'error' | 'pending';
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// 新增：工具调用信息接口
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
}

interface MessageBubbleProps {
  message: Message;
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

// 渲染思考过程
const renderThinking = (thinking: string) => {
  const [expanded, setExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 2,
        borderColor: '#9c27b0',
        bgcolor: '#f3e5f5',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.08)' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThinkingIcon fontSize="small" sx={{ color: '#9c27b0' }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#7b1fa2' }}>
            思考过程
          </Typography>
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0, borderTop: '1px solid #e1bee7' }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'SFMono-Regular, Consolas, monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              color: '#4a148c'
            }}
          >
            {thinking}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

// 单个工具调用组件（独立组件以使用 hooks）
const ToolCallItem: React.FC<{ toolCall: ToolCall }> = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(true); // 默认展开

  const statusColor =
    toolCall.status === 'completed' ? '#4caf50' :
    toolCall.status === 'error' ? '#f44336' :
    toolCall.status === 'running' ? '#ff9800' : '#2196f3';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: statusColor,
        bgcolor:
          toolCall.status === 'completed' ? '#f1f8f4' :
          toolCall.status === 'error' ? '#fef5f5' :
          toolCall.status === 'running' ? '#fff8e1' : '#e3f2fd',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.03)' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {toolCall.status === 'running' ? (
            <RunningIcon fontSize="small" sx={{ color: statusColor }} />
          ) : (
            <Build fontSize="small" sx={{ color: statusColor }} />
          )}
          <Typography variant="subtitle2" fontWeight={600}>
            {toolCall.name}
          </Typography>
          {toolCall.status && (
            <Chip
              label={toolCall.status}
              size="small"
              sx={{
                bgcolor: statusColor,
                color: 'white',
                height: 20,
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                '& .MuiChip-label': { px: 1 }
              }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, borderTop: `1px solid ${statusColor}33` }}>
          {/* 工具输入参数 */}
          {toolCall.input && Object.keys(toolCall.input).length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom sx={{ color: '#666' }}>
                输入参数:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: '#fafafa',
                  borderColor: '#e0e0e0'
                }}
              >
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{
                    fontFamily: 'SFMono-Regular, Consolas, monospace',
                    fontSize: '11px',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {JSON.stringify(toolCall.input, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* 工具执行结果 */}
          {toolCall.result && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom sx={{ color: '#4caf50' }}>
                执行结果:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: '#f8fff8',
                  borderColor: '#c8e6c9'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'SFMono-Regular, Consolas, monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {toolCall.result}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* 错误信息 */}
          {toolCall.error && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom sx={{ color: '#f44336' }}>
                错误信息:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: '#fff5f5',
                  borderColor: '#ffcdd2'
                }}
              >
                <Typography
                  variant="body2"
                  color="error"
                  sx={{
                    fontFamily: 'SFMono-Regular, Consolas, monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {toolCall.error}
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

// 渲染工具调用列表
const renderToolCalls = (toolCalls: ToolCall[]) => {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {toolCalls.map((toolCall) => (
        <ToolCallItem key={toolCall.id} toolCall={toolCall} />
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
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
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
        
        {/* 渲染思考过程 */}
        {renderThinking(message.thinking || '')}

        {/* 渲染工具调用 */}
        {renderToolCalls(message.toolCalls || [])}

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