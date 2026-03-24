"use client";

import React, { useState, useEffect } from 'react';
import { runes, ogham, translations, Rune, Ogham } from './alphabet';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

const Page = () => {
  const [text, setText] = useState('');
  const [runeTranslation, setRuneTranslation] = useState('');
  const [oghamTranslation, setOghamTranslation] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<Rune | Ogham | null>(null);

  useEffect(() => {
    const lowerCaseText = text.toLowerCase();
    let runeResult = '';
    let oghamResult = '';
    let i = 0;
    while (i < lowerCaseText.length) {
      let found = false;
      // Check for two-character keys first
      if (i + 1 < lowerCaseText.length) {
        const twoCharKey = lowerCaseText.substring(i, i + 2);
        if (translations[twoCharKey]) {
          const runeName = translations[twoCharKey].rune;
          const oghamName = translations[twoCharKey].ogham;
          if (runes[runeName]) {
            runeResult += runes[runeName].glyph;
          }
          if (ogham[oghamName]) {
            oghamResult += ogham[oghamName].glyph;
          }
          i += 2;
          found = true;
        }
      }
      // If no two-character key, check for one-character key
      if (!found) {
        const oneCharKey = lowerCaseText[i];
        if (translations[oneCharKey]) {
          const runeName = translations[oneCharKey].rune;
          const oghamName = translations[oneCharKey].ogham;
          if (runes[runeName]) {
            runeResult += runes[runeName].glyph;
          } else if (runeName === 'space') {
            runeResult += '᛫';
          }
          if (ogham[oghamName]) {
            oghamResult += ogham[oghamName].glyph;
          } else if (oghamName === 'space') {
            oghamResult += ' ';
          }
        } else {
          runeResult += oneCharKey;
          oghamResult += oneCharKey;
        }
        i += 1;
      }
    }
    setRuneTranslation(runeResult);
    setOghamTranslation(oghamResult ? `᚛${oghamResult}᚜` : '');
  }, [text]);

  const handleSelectSymbol = (symbol: Rune | Ogham) => {
    setSelectedSymbol(symbol);
  };

  return (
    <Box sx={{ padding: '2rem' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Vara - Rune and Ogham Translator
      </Typography>
      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        rows={5}
        fullWidth
        placeholder="Enter text to translate"
        variant="outlined"
        sx={{ marginBottom: '1rem' }}
      />
      {(runeTranslation || oghamTranslation) && (
        <Paper elevation={3} sx={{ marginTop: '1rem', padding: '1rem' }}>
          <Typography variant="h5" component="h2">Translation</Typography>
          {runeTranslation && (
            <Box>
              <Typography variant="h6">Runes</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{runeTranslation}</Typography>
            </Box>
          )}
          {oghamTranslation && (
            <Box>
              <Typography variant="h6">Ogham</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{oghamTranslation}</Typography>
            </Box>
          )}
        </Paper>
      )}

      <Grid container spacing={2} sx={{ marginTop: '2rem' }}>
        <Grid item xs={6}>
          <Paper elevation={3} sx={{ padding: '1rem', height: '400px', overflowY: 'auto' }}>
            <Typography variant="h5" component="h2">Symbols</Typography>
            <List>
              <Typography variant="h6">Runes</Typography>
              {Object.values(runes).map((rune) => (
                <ListItem button key={rune.name} onClick={() => handleSelectSymbol(rune)} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary={`${rune.glyph} - ${rune.name}`} />
                </ListItem>
              ))}
              <Divider sx={{ marginY: '1rem' }} />
              <Typography variant="h6">Ogham</Typography>
              {Object.values(ogham).map((ogham) => (
                <ListItem button key={ogham.name} onClick={() => handleSelectSymbol(ogham)} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary={`${ogham.glyph} - ${ogham.name}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper elevation={3} sx={{ padding: '1rem', height: '400px', overflowY: 'auto' }}>
            {selectedSymbol ? (
              <Box>
                <Typography variant="h4">{selectedSymbol.glyph}</Typography>
                <Typography variant="h5">{selectedSymbol.name}</Typography>
                <Typography variant="body1"><strong>Meaning:</strong> {selectedSymbol.meaning}</Typography>
                {'poem' in selectedSymbol && selectedSymbol.poem.original && (
                  <Box sx={{ marginTop: '1rem' }}>
                    <Typography variant="h6">Rune Poem</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{selectedSymbol.poem.original}</Typography>
                    <Typography variant="body2">{selectedSymbol.poem.translation}</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="h6" sx={{ textAlign: 'center', marginTop: '2rem' }}>
                Select a symbol to see its details
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Page;
