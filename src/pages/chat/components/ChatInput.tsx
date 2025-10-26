import React, { useEffect } from 'react';
import { Paper, TextField, IconButton, Tooltip, Box, Typography } from '@mui/material';
import { Send as SendIcon, Mic as MicIcon, MicOff as MicOffIcon } from '@mui/icons-material';

interface ChatInputProps {
  inputText: string;
  setInputText: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  // 语音输入相关
  isListening?: boolean;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  voiceError?: string | null;
  isVoiceSupported?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  isListening = false,
  onStartVoice,
  onStopVoice,
  voiceError,
  isVoiceSupported = false,
}) => {
  // 当有语音错误时显示提示
  useEffect(() => {
    if (voiceError) {
      console.error('语音识别错误:', voiceError);
    }
  }, [voiceError]);

  const handleVoiceClick = () => {
    if (isListening) {
      onStopVoice?.();
    } else {
      onStartVoice?.();
    }
  };

  // 确定麦克风按钮的提示文本
  const getMicTooltip = () => {
    if (!isVoiceSupported) return '当前浏览器不支持语音输入';
    if (isListening) return '点击停止录音';
    if (voiceError) return voiceError;
    return '点击开始语音输入';
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderTop: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 0,
      }}
    >
      {/* 语音错误提示 */}
      {voiceError && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: 'error.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'error.200'
          }}
        >
          <Typography variant="caption" color="error">
            {voiceError}
          </Typography>
        </Box>
      )}

      {/* 语音识别中提示 */}
      {isListening && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: 'info.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'info.200',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <MicIcon fontSize="small" color="primary" sx={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          <Typography variant="caption" color="primary">
            正在录音,请说话...
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={
            isLoading
              ? "处理中..."
              : isListening
                ? "正在识别语音..."
                : "输入消息或点击麦克风使用语音输入..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={isLoading || isListening}
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

        {/* 语音输入按钮 */}
        {isVoiceSupported && (
          <Tooltip title={getMicTooltip()}>
            <IconButton
              onClick={handleVoiceClick}
              disabled={isLoading}
              sx={{
                bgcolor: isListening ? 'error.main' : 'grey.100',
                color: isListening ? 'white' : 'grey.700',
                width: 40,
                height: 40,
                '&:hover': {
                  bgcolor: isListening ? 'error.dark' : 'grey.200'
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500'
                },
                transition: 'all 0.3s ease',
              }}
            >
              {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        {/* 发送按钮 */}
        <Tooltip title="发送消息 (Enter)">
          <IconButton
            onClick={onSendMessage}
            disabled={!inputText.trim() || isLoading || isListening}
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
        </Tooltip>
      </Box>

      {/* 添加脉冲动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Paper>
  );
};