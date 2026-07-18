"use client";

import React, { useState, useEffect } from 'react';
import { runes, ogham, translations, youngerFuthark, shortTwigFuthark, stavelessFuthark, medievalRunerow, angloSaxonFuthark, Rune, Ogham } from './alphabet';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const translateToElderFuthark = (text: string): string => {
  const lower = text.toLowerCase();
  let result = '';
  let i = 0;
  while (i < lower.length) {
    let found = false;
    if (i + 1 < lower.length) {
      const two = lower.substring(i, i + 2);
      if (translations[two]) {
        const name = translations[two].rune;
        if (runes[name]) result += runes[name].glyph;
        i += 2;
        found = true;
      }
    }
    if (!found) {
      const one = lower[i];
      if (translations[one]) {
        const name = translations[one].rune;
        if (runes[name]) result += runes[name].glyph;
        else if (name === 'space') result += '᛫';
      } else {
        result += one;
      }
      i++;
    }
  }
  return result;
};

const translateToOgham = (text: string): string => {
  const lower = text.toLowerCase();
  let result = '';
  let i = 0;
  while (i < lower.length) {
    let found = false;
    if (i + 1 < lower.length) {
      const two = lower.substring(i, i + 2);
      if (translations[two]) {
        const name = translations[two].ogham;
        if (ogham[name]) result += ogham[name].glyph;
        i += 2;
        found = true;
      }
    }
    if (!found) {
      const one = lower[i];
      if (translations[one]) {
        const name = translations[one].ogham;
        if (ogham[name]) result += ogham[name].glyph;
        else if (name === 'space') result += ' ';
      } else {
        result += one;
      }
      i++;
    }
  }
  return result ? `᚛${result}᚜` : '';
};

const norseEntries = [
  { english: 'Odin', description: 'God of wisdom, war, and death' },
  { english: 'Thor', description: 'God of thunder' },
  { english: 'Freyr', description: 'God of fertility and prosperity' },
  { english: 'Freyja', description: 'Goddess of love, war, and magic' },
  { english: 'Loki', description: 'God of mischief' },
  { english: 'Tyr', description: 'God of war and justice' },
  { english: 'Baldur', description: 'God of light' },
  { english: 'Heimdall', description: 'Guardian of the Bifrost' },
  { english: 'Njord', description: 'God of the sea' },
  { english: 'Skadi', description: 'Goddess of winter and hunting' },
  { english: 'Idun', description: 'Keeper of the golden apples' },
  { english: 'Hel', description: 'Ruler of the dead' },
  { english: 'Ymir', description: 'Primordial giant' },
  { english: 'Fenrir', description: 'Monstrous wolf, son of Loki' },
  { english: 'Sigurd', description: 'Hero, slayer of the dragon Fafnir' },
  { english: 'Asgard', description: 'Realm of the gods' },
  { english: 'Midgard', description: 'Realm of humanity' },
  { english: 'Valhalla', description: 'Hall of the honored dead' },
  { english: 'Yggdrasil', description: 'The world tree' },
  { english: 'Bifrost', description: 'The rainbow bridge' },
  { english: 'Ragnarok', description: 'Twilight of the gods' },
  { english: 'Niflheim', description: 'Realm of ice and mist' },
  { english: 'Vanaheim', description: 'Realm of the Vanir' },
  { english: 'Jotunheim', description: 'Realm of the giants' },
  { english: 'Alfheim', description: 'Realm of the light elves' },
];

const celticEntries = [
  { english: 'Dagda', description: 'Father of the gods' },
  { english: 'Lugh', description: 'God of light and skill' },
  { english: 'Brigid', description: 'Goddess of fire, poetry, and healing' },
  { english: 'Morrigan', description: 'Goddess of fate and war' },
  { english: 'Cernunnos', description: 'God of nature and animals' },
  { english: 'Danu', description: 'Mother goddess' },
  { english: 'Nuada', description: 'King of the Tuatha De Danann' },
  { english: 'Manannon', description: 'God of the sea' },
  { english: 'Aine', description: 'Goddess of summer and love' },
  { english: 'Arawn', description: 'King of the Otherworld' },
  { english: 'Rhiannon', description: 'Goddess of horses and dreams' },
  { english: 'Bran', description: 'Guardian king of Britain' },
  { english: 'Epona', description: 'Goddess of horses' },
  { english: 'Taranis', description: 'God of thunder' },
  { english: 'Belenus', description: 'God of the sun' },
  { english: 'Avalon', description: 'Isle of the blessed' },
  { english: 'Tir na Nog', description: 'Land of eternal youth' },
  { english: 'Druids', description: 'Celtic priestly class' },
  { english: 'Samhain', description: 'Festival of the dead' },
  { english: 'Beltane', description: 'Festival of fire' },
  { english: 'Imbolc', description: 'Festival of spring' },
  { english: 'Lughnasadh', description: 'Harvest festival' },
  { english: 'Cauldron', description: 'Symbol of abundance and rebirth' },
  { english: 'Ogham', description: 'Ancient Irish writing system' },
];

const Page = () => {
  const [text, setText] = useState('');
  const [runeTranslation, setRuneTranslation] = useState('');
  const [youngerFutharkTranslation, setYoungerFutharkTranslation] = useState('');
  const [shortTwigTranslation, setShortTwigTranslation] = useState('');
  const [stavelessTranslation, setStavelessTranslation] = useState('');
  const [medievalTranslation, setMedievalTranslation] = useState('');
  const [angloSaxonTranslation, setAngloSaxonTranslation] = useState('');
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

    const translateScript = (script: { [key: string]: string }): string => {
      let result = '';
      for (const char of lowerCaseText) {
        result += script[char] ?? char;
      }
      return result;
    };

    setYoungerFutharkTranslation(translateScript(youngerFuthark));
    setShortTwigTranslation(translateScript(shortTwigFuthark));
    setStavelessTranslation(translateScript(stavelessFuthark));
    setMedievalTranslation(translateScript(medievalRunerow));
    setAngloSaxonTranslation(translateScript(angloSaxonFuthark));
  }, [text]);

  const handleSelectSymbol = (symbol: Rune | Ogham) => {
    setSelectedSymbol(symbol);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Glyph
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
              <Typography variant="h6">Elder Futhark</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{runeTranslation}</Typography>
            </Box>
          )}
          {youngerFutharkTranslation && (
            <Box>
              <Typography variant="h6">Younger Futhark</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{youngerFutharkTranslation}</Typography>
            </Box>
          )}
          {shortTwigTranslation && (
            <Box>
              <Typography variant="h6">Short-Twig Futhark</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{shortTwigTranslation}</Typography>
            </Box>
          )}
          {stavelessTranslation && (
            <Box>
              <Typography variant="h6">Staveless Hälsinge Futhark</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{stavelessTranslation}</Typography>
            </Box>
          )}
          {medievalTranslation && (
            <Box>
              <Typography variant="h6">Medieval Runerow</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{medievalTranslation}</Typography>
            </Box>
          )}
          {angloSaxonTranslation && (
            <Box>
              <Typography variant="h6">Anglo-Saxon Futhark</Typography>
              <Typography sx={{ fontSize: '2rem' }}>{angloSaxonTranslation}</Typography>
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
                {'aett' in selectedSymbol && (
                  <Typography variant="body1"><strong>Aett:</strong> {selectedSymbol.aett}</Typography>
                )}
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

      <Box sx={{ marginTop: '3rem' }}>
        <Typography variant="h5" component="h2" gutterBottom>Norse Gods &amp; Lore — Elder Futhark</Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>English</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Elder Futhark</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {norseEntries.map((entry) => (
                <TableRow key={entry.english}>
                  <TableCell>{entry.english}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell sx={{ fontSize: '1.4rem' }}>{translateToElderFuthark(entry.english)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ marginTop: '3rem' }}>
        <Typography variant="h5" component="h2" gutterBottom>Celtic Gods &amp; Lore — Ogham</Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>English</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Ogham</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {celticEntries.map((entry) => (
                <TableRow key={entry.english}>
                  <TableCell>{entry.english}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell sx={{ fontSize: '1.4rem' }}>{translateToOgham(entry.english)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Page;
