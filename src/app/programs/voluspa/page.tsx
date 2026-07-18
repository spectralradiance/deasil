"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Collapse from '@mui/material/Collapse';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ViewListIcon from '@mui/icons-material/ViewList';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { motion } from 'framer-motion';

import { MAX_STANZAS, TRANSLATIONS } from './constants';
import { StanzaCard } from './StanzaCard';
import type { ViewMode, VoluspaData } from './types';

export default function VoluspaPage() {
  const [view, setView] = useState<ViewMode>('stanza');
  const [translationKey, setTranslationKey] = useState('bellows');
  const [dataCache, setDataCache] = useState<Record<string, VoluspaData>>({});
  const [stanzaNumber, setStanzaNumber] = useState(1);
  const [introExpanded, setIntroExpanded] = useState(false);
  // User-controlled ordering of translations in the compare view
  const [translationOrder, setTranslationOrder] = useState<string[]>(
    () => TRANSLATIONS.map(t => t.key)
  );

  // Track which translations have already been fetched to avoid duplicate requests
  const loadedRef = useRef(new Set<string>());

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadTranslation = useCallback((key: string) => {
    if (loadedRef.current.has(key)) return;
    loadedRef.current.add(key);
    const t = TRANSLATIONS.find(t => t.key === key)!;
    fetch(t.file)
      .then(r => r.json())
      .then((json: VoluspaData) => setDataCache(prev => ({ ...prev, [key]: json })))
      .catch(() => loadedRef.current.delete(key)); // allow retry on fetch failure
  }, []);

  // Load the active translation whenever it changes
  useEffect(() => {
    loadTranslation(translationKey);
  }, [translationKey, loadTranslation]);

  // Pre-load all translations when compare view is selected
  useEffect(() => {
    if (view === 'compare') {
      TRANSLATIONS.forEach(t => loadTranslation(t.key));
    }
  }, [view, loadTranslation]);

  // Collapse the intro note whenever the user switches translation
  useEffect(() => {
    setIntroExpanded(false);
  }, [translationKey]);

  // ── Derived values ───────────────────────────────────────────────────────

  const currentData = dataCache[translationKey];
  const currentMax = currentData?.stanzas.length ?? MAX_STANZAS;
  // In compare mode we navigate up to the global maximum
  const maxForView = view === 'compare' ? MAX_STANZAS : currentMax;

  // Clamp stanza index if the new translation is shorter than the current one
  useEffect(() => {
    if (currentData) {
      setStanzaNumber(n => Math.min(n, currentData.stanzas.length));
    }
  }, [currentData]);

  // ── Keyboard navigation (stanza / compare views only) ───────────────────

  useEffect(() => {
    if (view === 'single') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStanzaNumber(n => Math.min(n + 1, maxForView));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStanzaNumber(n => Math.max(n - 1, 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, maxForView]);

  // ── Navigation helpers ───────────────────────────────────────────────────

  const goNext = () => setStanzaNumber(n => Math.min(n + 1, maxForView));
  const goPrev = () => setStanzaNumber(n => Math.max(n - 1, 1));

  /** Swap a translation one step up (-1) or down (+1) in the compare view. */
  const moveTranslation = (key: string, dir: -1 | 1) => {
    setTranslationOrder(order => {
      const idx = order.indexOf(key);
      const next = idx + dir;
      if (next < 0 || next >= order.length) return order;
      const arr = [...order];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  // Derive the display-ordered array for the compare view
  const orderedTranslations = translationOrder.map(key => TRANSLATIONS.find(t => t.key === key)!);

  // stanzaNumber is 1-based, matching stanza.index values in the JSON
  const currentStanza = currentData?.stanzas[stanzaNumber - 1];

  const byline = currentData?.translator
    ? `Translated by ${currentData.translator}`
    : currentData?.edition ?? '';

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Völuspá
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        The Prophecy of the Seeress
      </Typography>

      {/* ── Controls row ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => { if (v) setView(v); }}
          size="small"
        >
          <ToggleButton value="stanza" aria-label="One stanza at a time">
            <MenuBookIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Stanza
          </ToggleButton>
          <ToggleButton value="single" aria-label="Full text of one translation">
            <ViewListIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Full Text
          </ToggleButton>
          <ToggleButton value="compare" aria-label="Compare all translations">
            <CompareArrowsIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Compare
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Translation picker — hidden in compare mode (all are shown) */}
        {view !== 'compare' && (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="translation-label">Translation</InputLabel>
            <Select
              labelId="translation-label"
              value={translationKey}
              label="Translation"
              onChange={e => setTranslationKey(e.target.value)}
            >
              {TRANSLATIONS.map(t => (
                <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* ── STANZA VIEW ─────────────────────────────────────────────────── */}
      {view === 'stanza' && (
        !currentData ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : currentStanza ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 2 }}>
              <IconButton onClick={goPrev} disabled={stanzaNumber <= 1} size="large" aria-label="Previous stanza">
                <ArrowBackIosNewIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {stanzaNumber} / {currentMax}
              </Typography>
              <IconButton onClick={goNext} disabled={stanzaNumber >= currentMax} size="large" aria-label="Next stanza">
                <ArrowForwardIosIcon />
              </IconButton>
            </Box>
            <StanzaCard stanza={currentStanza} />
            {byline && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                {byline}
              </Typography>
            )}
          </>
        ) : null
      )}

      {/* ── FULL TEXT VIEW ──────────────────────────────────────────────── */}
      {view === 'single' && (
        !currentData ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <>
            {currentData.introductory_note && (
              <Box sx={{ mb: 3 }}>
                <Box
                  component="button"
                  onClick={() => setIntroExpanded(e => !e)}
                  sx={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    p: 0,
                    mb: 1,
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  Introduction {introExpanded ? '▲' : '▼'}
                </Box>
                <Collapse in={introExpanded}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.9 }}>
                      {currentData.introductory_note}
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {currentData.stanzas.map(stanza => {
                // Bray uses section headings inserted after specific stanzas
                const sectionAfter = currentData.sections?.find(
                  s => s.after_stanza === stanza.index
                )?.title;
                return (
                  <React.Fragment key={stanza.index}>
                    <StanzaCard stanza={stanza} />
                    {sectionAfter && (
                      <Typography
                        variant="overline"
                        sx={{ display: 'block', textAlign: 'center', letterSpacing: 3, color: 'text.secondary', py: 0.5 }}
                      >
                        ✦ {sectionAfter} ✦
                      </Typography>
                    )}
                  </React.Fragment>
                );
              })}
            </Box>

            {byline && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, fontStyle: 'italic' }}>
                {byline}
              </Typography>
            )}
          </>
        )
      )}

      {/* ── COMPARE VIEW ────────────────────────────────────────────────── */}
      {view === 'compare' && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <IconButton onClick={goPrev} disabled={stanzaNumber <= 1} size="large" aria-label="Previous stanza">
              <ArrowBackIosNewIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Stanza {stanzaNumber} / {MAX_STANZAS}
            </Typography>
            <IconButton onClick={goNext} disabled={stanzaNumber >= MAX_STANZAS} size="large" aria-label="Next stanza">
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {orderedTranslations.map((t, idx) => {
              const tData = dataCache[t.key];
              const canMoveUp   = idx > 0;
              const canMoveDown = idx < orderedTranslations.length - 1;

              // Reorder gutter — shared by all card states
              const reorderGutter = (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5, flexShrink: 0 }}>
                  <IconButton size="small" disabled={!canMoveUp}   onClick={() => moveTranslation(t.key, -1)} aria-label="Move translation up">
                    <KeyboardArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" disabled={!canMoveDown} onClick={() => moveTranslation(t.key,  1)} aria-label="Move translation down">
                    <KeyboardArrowDownIcon fontSize="small" />
                  </IconButton>
                </Box>
              );

              // Still fetching
              if (!tData) {
                return (
                  <motion.div
                    key={t.key}
                    layout
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                  >
                    {reorderGutter}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
                      <Typography variant="overline" color="text.secondary">{t.label}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading…</Typography>
                    </Paper>
                  </motion.div>
                );
              }

              const tStanza = tData.stanzas.find(s => s.index === stanzaNumber);
              // Translation doesn't include this stanza number
              if (!tStanza) {
                return (
                  <motion.div
                    key={t.key}
                    layout
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                  >
                    {reorderGutter}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, opacity: 0.45 }}>
                      <Typography variant="overline" color="text.secondary">{t.label}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Not included in this translation
                      </Typography>
                    </Paper>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={t.key}
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                >
                  {reorderGutter}
                  <Box sx={{ flex: 1 }}>
                    {/* Translation name shown above the card in compare mode */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.75, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}
                    >
                      {t.label}
                    </Typography>
                    <StanzaCard stanza={tStanza} />
                  </Box>
                </motion.div>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}




