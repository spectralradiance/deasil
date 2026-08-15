'use client';
import React, { memo, useState } from 'react';
import {
  Box, Chip, Dialog, DialogContent,
  Divider, IconButton, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { DivinationToken } from './ReadingEntry';

export interface SymbolGroup { name: string; tokens: DivinationToken[]; }

const SymbolTile = memo(function SymbolTile({
  token, globalIndex, onInfo,
}: {
  token: DivinationToken;
  globalIndex: number;
  onInfo: (t: DivinationToken) => void;
}) {
  return (
    <Box onClick={() => onInfo(token)} sx={{
      cursor: 'pointer', textAlign: 'center',
      opacity: 0,
      animation: 'symSlideIn 0.3s ease forwards',
      animationDelay: `${Math.min(globalIndex * 15, 500)}ms`,
      '@keyframes symSlideIn': {
        from: { opacity: 0, transform: 'translateY(12px)' },
        to:   { opacity: 1, transform: 'translateY(0)' },
      },
      transition: 'filter 0.15s',
      '&:hover': { filter: 'brightness(1.25)' },
    }}>
      <Box sx={{
        width: '100%', aspectRatio: '1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid', borderColor: 'divider', borderRadius: 2,
        bgcolor: 'background.paper', transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'primary.main' },
      }}>
        <Typography sx={{ fontSize: '2.4rem', lineHeight: 1, userSelect: 'none' }}>
          {token.symbol}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{
        display: 'block', mt: 0.5, fontSize: '0.68rem',
        color: 'text.secondary', lineHeight: 1.2,
      }}>
        {token.name}
      </Typography>
    </Box>
  );
});

interface Props { groups: SymbolGroup[]; }

export default function SymbolBrowser({ groups }: Props) {
  const [detail, setDetail] = useState<DivinationToken | null>(null);

  // Precompute per-group global start index for stagger continuity
  const offsets = groups.map((_, gi) =>
    groups.slice(0, gi).reduce((s, g) => s + g.tokens.length, 0),
  );

  return (
    <>
      {groups.map(({ name, tokens }, gi) => (
        <Box key={name} sx={{ mt: gi === 0 ? 3 : 5, maxWidth: 960, mx: 'auto', width: '100%' }}>
          {gi > 0 && <Divider sx={{ mb: 3 }} />}
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            {name}
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(5, 1fr)', sm: 'repeat(8, 1fr)', md: 'repeat(10, 1fr)' },
            gap: 1.5,
          }}>
            {tokens.map((token, i) => (
              <SymbolTile key={token.id} token={token} globalIndex={offsets[gi] + i} onInfo={setDetail} />
            ))}
          </Box>
        </Box>
      ))}

      {detail && (
        <Dialog open onClose={() => setDetail(null)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { bgcolor: '#0a0a0a', backgroundImage: 'none' } }}>
          <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 3 }}>
            <IconButton onClick={() => setDetail(null)}
              sx={{ position: 'absolute', top: 8, right: 8 }} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontSize: '5rem', lineHeight: 1, mb: 1 }}>{detail.symbol}</Typography>
            <Typography variant="h5" gutterBottom>{detail.name}</Typography>
            {detail.secondary && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {detail.secondary}
              </Typography>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 2 }}>
              {detail.keywords.map(kw => <Chip key={kw} label={kw} size="small" />)}
            </Box>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              {detail.upright}
            </Typography>
            {detail.reversed && (
              <>
                <Typography variant="overline" sx={{ display: 'block', mt: 2, mb: 0.5 }}>Reversed</Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  {detail.reversed}
                </Typography>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
