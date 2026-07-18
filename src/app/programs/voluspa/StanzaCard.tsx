"use client";

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Stanza, Footnote } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise both legacy (footnote string) and modern (footnotes array) data. */
function getFootnotes(stanza: Stanza): Footnote[] {
  if (stanza.footnotes?.length) return stanza.footnotes;
  if (stanza.footnote) return [{ number: 1, text: stanza.footnote }];
  return [];
}

/**
 * Render stanza text with caesura support.
 * A vertical bar `|` marks a caesura — it is replaced by a visual
 * em-space gap rather than displayed as punctuation.
 */
function renderStanzaText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split('|');
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => (
          <React.Fragment key={partIdx}>
            {/* Trim whitespace that was padding the | in the source */}
            {part.trim()}
            {partIdx < parts.length - 1 && (
              // Visual caesura gap — ~2.5 em of horizontal space
              <span style={{ display: 'inline-block', width: '2.5em' }} />
            )}
          </React.Fragment>
        ))}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StanzaCardProps {
  stanza: Stanza;
}

/**
 * Displays a single stanza with:
 * - The stanza number as a left-side gutter label
 * - Plain (non-italic) stanza text, with caesura gaps where | appears
 * - A collapsible footnotes section toggled by a small grey button
 */
export function StanzaCard({ stanza }: StanzaCardProps) {
  const [footnotesOpen, setFootnotesOpen] = useState(false);
  const footnotes = getFootnotes(stanza);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Row: gutter number | stanza body */}
      <Box sx={{ display: 'flex', gap: 2.5 }}>

        {/* Stanza number — muted, non-selectable gutter */}
        <Box
          sx={{ minWidth: 24, pt: 0.3, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}
        >
        <Typography variant="body2" color="text.disabled" sx={{ userSelect: 'none'}}>
          {stanza.index}
        </Typography>
        {footnotes.length > 0 && (
          <IconButton
            size="small"
            onClick={() => setFootnotesOpen(o => !o)}
            aria-label={footnotesOpen ? 'Collapse footnotes' : 'Expand footnotes'}
            sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
          >
            {footnotesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
        </Box>

        {/* Stanza text + footnotes toggle, sharing the same column */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body1"
            sx={{ lineHeight: 2, fontSize: '1.05rem' }}
          >
            {renderStanzaText(stanza.text)}
          </Typography>

          {/* Footnotes — hidden by default, revealed by button */}
          {footnotes.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Collapse in={footnotesOpen}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {footnotes.map((fn, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', lineHeight: 1.7 }}
                    >
                      {fn.number != null && <sup style={{ marginRight: 3 }}>{fn.number}</sup>}
                      {fn.text}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
}
