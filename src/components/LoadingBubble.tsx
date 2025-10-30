import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

/**
 * Loading 气泡组件
 * 显示在聊天消息底部，表示 AI 正在思考或执行任务
 */
export const LoadingBubble: React.FC = () => {
  // 点动画效果
  const dotAnimation = keyframes`
    0%, 20% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
    }
  `;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        mb: 2,
        alignItems: 'flex-start',
        gap: 2
      }}
    >
      {/* AI 头像 */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: '#CC785C',
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
            color: 'white',
            fontWeight: 600,
            fontSize: '12px'
          }}
        >
          C
        </Typography>
      </Box>

      {/* Loading 内容 */}
      <Box
        sx={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: '#f5f5f5',
            color: '#1a1a1a',
            borderRadius: 2,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {/* 跳动的点 */}
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#CC785C',
                animation: `${dotAnimation} 1.4s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};
