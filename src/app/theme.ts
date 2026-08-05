"use client";

import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#171717',
      secondary: '#555',
    },
    primary: {
      main: '#42a5f5',
    },
    secondary: {
      main: '#ffb300',
    },
  },
  typography: {
    fontFamily: 'Baloo 2, Arial, Helvetica, sans-serif',
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a0a',
      paper: '#171717',
    },
    text: {
      primary: '#ededed',
      secondary: '#bdbdbd',
    },
    primary: {
      main: '#D4A017',
    },
    secondary: {
      main: '#ffd54f',
    },
  },
  typography: {
    fontFamily: 'Baloo 2, Arial, Helvetica, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // text/outlined primary buttons stay gold; lighter gold on hover
          '&.MuiButton-textPrimary, &.MuiButton-outlinedPrimary': {
            color: '#D4A017',
          },
          '&.MuiButton-textPrimary:hover, &.MuiButton-outlinedPrimary:hover': {
            color: '#F0C848',
            backgroundColor: 'rgba(212,160,23,0.10)',
          },
        },
      },
    },
  },
});
