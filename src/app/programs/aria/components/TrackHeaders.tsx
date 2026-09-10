// Column headers above the pattern grid. Widths mirror PatternGrid's layout.

'use client';
import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Pattern, Song } from '../lib/song';
import { isAudible, MAX_TRACKS } from '../lib/song';

interface Props {
  song: Song;
  pattern: Pattern;
  selected: number;
  onSelect: (index: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onAddTrack: () => void;
}

export default function TrackHeaders({
  song, pattern, selected, onSelect, onToggleMute, onToggleSolo, onAddTrack,
}: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 12,
        mb: 0.5,
      }}
    >
      {/* Matches the grid's row-number gutter. */}
      <Box sx={{ width: 40, flexShrink: 0, display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
        {song.tracks.length < MAX_TRACKS && (
          <Tooltip title="Add a track">
            <IconButton size="small" onClick={onAddTrack} sx={{ p: 0.25 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {song.tracks.map((track, index) => {
        const audible = isAudible(song, track);
        return (
          <Box
            key={track.id}
            onClick={() => onSelect(index)}
            sx={{
              flex: '1 1 0',
              minWidth: 56,
              px: 0.5,
              pb: 0.5,
              cursor: 'pointer',
              borderBottom: '2px solid',
              borderColor: index === selected ? 'primary.main' : 'transparent',
              opacity: audible ? 1 : 0.4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: '100%' }}>
              {pattern.lanes[track.id]?.generator.live && (
                <Tooltip title="Generating live: this track re-rolls from its generator settings">
                  <Box
                    sx={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'primary.main',
                    }}
                  />
                </Tooltip>
              )}
              <Typography
                noWrap
                sx={{ fontSize: 12, fontFamily: 'inherit' }}
                title={track.name}
              >
                {track.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              <Tooltip title="Mute">
                <Box
                  component="button"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleMute(track.id); }}
                  sx={{
                    font: 'inherit', lineHeight: 1, px: 0.6, py: 0.2, cursor: 'pointer',
                    border: '1px solid', borderColor: 'divider', borderRadius: 0.5,
                    backgroundColor: track.mute ? 'warning.main' : 'transparent',
                    color: track.mute ? 'warning.contrastText' : 'inherit',
                  }}
                >
                  M
                </Box>
              </Tooltip>
              <Tooltip title="Solo">
                <Box
                  component="button"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleSolo(track.id); }}
                  sx={{
                    font: 'inherit', lineHeight: 1, px: 0.6, py: 0.2, cursor: 'pointer',
                    border: '1px solid', borderColor: 'divider', borderRadius: 0.5,
                    backgroundColor: track.solo ? 'success.main' : 'transparent',
                    color: track.solo ? 'success.contrastText' : 'inherit',
                  }}
                >
                  S
                </Box>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
