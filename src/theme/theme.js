export const lightTheme = {
  mode: 'light',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  text: '#172B50',
  mutedText: '#67748E',
  border: '#E1E5EC',
};

export const darkTheme = {
  mode: 'dark',
  background: '#101827',
  surface: '#1B2638',
  text: '#F4F7FC',
  mutedText: '#B6C2D6',
  border: '#344258',
};

export const getTheme = mode => mode === 'dark' ? darkTheme : lightTheme;