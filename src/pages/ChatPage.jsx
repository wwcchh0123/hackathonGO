import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';

function ChatPage() {
  const [input, setInput] = useState('');
  const { chatHistory, addMessage, clearChatHistory } = useConfig();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;

    await addMessage({
      role: 'user',
      content: input,
    });

    setInput('');

    setTimeout(async () => {
      await addMessage({
        role: 'assistant',
        content: '这是一个示例回复。请在设置中配置您的大模型来启用实际的对话功能。',
      });
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1e1e1e',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ color: '#ccc' }}>
          聊天
        </Typography>
        <IconButton
          onClick={clearChatHistory}
          size="small"
          sx={{ color: '#999' }}
          disabled={chatHistory.length === 0}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {chatHistory.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <BotIcon sx={{ fontSize: 64, color: '#e07b39', opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: '#666' }}>
              开始对话
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              在下方输入框中输入消息开始聊天
            </Typography>
          </Box>
        ) : (
          chatHistory.map((msg, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: msg.role === 'user' ? '#555' : '#e07b39',
                  width: 32,
                  height: 32,
                }}
              >
                {msg.role === 'user' ? (
                  <PersonIcon fontSize="small" />
                ) : (
                  <BotIcon fontSize="small" />
                )}
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: msg.role === 'user' ? '#2a2a2a' : '#252525',
                  flexGrow: 1,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: '#ccc',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #333',
          bgcolor: '#1e1e1e',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#252525',
                '& fieldset': {
                  borderColor: '#333',
                },
                '&:hover fieldset': {
                  borderColor: '#555',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e07b39',
                },
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim()}
            sx={{
              bgcolor: '#e07b39',
              color: '#fff',
              '&:hover': {
                bgcolor: '#c96a2e',
              },
              '&:disabled': {
                bgcolor: '#333',
                color: '#666',
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

export default ChatPage;
