import React, { createContext, useContext, useState, useEffect } from 'react';

const ConfigContext = createContext();

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    llmModels: [],
    systemPrompt: 'You are a helpful assistant.',
    mcpServices: []
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const [loadedConfig, loadedHistory] = await Promise.all([
          window.electronAPI.loadUserConfig(),
          window.electronAPI.loadChatHistory()
        ]);
        setConfig(loadedConfig);
        setChatHistory(loadedHistory);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
    setLoading(false);
  };

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    if (window.electronAPI) {
      await window.electronAPI.saveUserConfig(newConfig);
    }
  };

  const saveChatHistory = async (newHistory) => {
    setChatHistory(newHistory);
    if (window.electronAPI) {
      await window.electronAPI.saveChatHistory(newHistory);
    }
  };

  const addMessage = async (message) => {
    const newHistory = [...chatHistory, { ...message, timestamp: Date.now() }];
    await saveChatHistory(newHistory);
  };

  const clearChatHistory = async () => {
    await saveChatHistory([]);
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        setConfig: saveConfig,
        chatHistory,
        addMessage,
        clearChatHistory,
        loading
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}
