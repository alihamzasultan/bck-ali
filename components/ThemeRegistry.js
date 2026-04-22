'use client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6",
    },
    background: {
      default: "#020617",
      paper: "#0f172a",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 9,
          fontWeight: 700,
        },
      },
    },
  },
});

export default function ThemeRegistry({ children }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
