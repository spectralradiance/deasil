// Save, load, and render the song to an audio file.

'use client';
import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { parseSong, serializeSong } from '../lib/serialize';
import { bounceToWav } from '../lib/bounce';
import { orderLength, type Song } from '../lib/song';

interface Props {
  song: Song;
  onLoad: (song: Song) => void;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the navigation to have started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SongIO({ song, onLoad }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const exportJson = () => {
    download(new Blob([serializeSong(song)], { type: 'application/json' }), 'song.aria.json');
    setMessage({ kind: 'ok', text: 'Saved song.aria.json' });
  };

  const importJson = async (file: File) => {
    try {
      const parsed = parseSong(JSON.parse(await file.text()));
      onLoad(parsed);
      setMessage({ kind: 'ok', text: `Loaded ${file.name}` });
    } catch {
      setMessage({ kind: 'error', text: `${file.name} is not a song Aria can read.` });
    }
  };

  const bounce = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await bounceToWav(song, { repeats: 2 });
      download(blob, 'song.wav');
      setMessage({ kind: 'ok', text: `Rendered song.wav — ${(blob.size / 1048576).toFixed(1)} MB` });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Render failed.' });
    } finally {
      setBusy(false);
    }
  };

  const seconds = (orderLength(song) * 2 * 60) / song.bpm / song.stepsPerBeat;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportJson}>
          export json
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileRef.current?.click()}
        >
          import json
        </Button>
        <Box
          component="input"
          type="file"
          accept="application/json,.json"
          ref={fileRef}
          sx={{ display: 'none' }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = '';
          }}
        />
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <GraphicEqIcon />}
          onClick={bounce}
        >
          {busy ? 'rendering…' : 'render wav'}
        </Button>
      </Stack>

      {message && (
        <Alert severity={message.kind === 'ok' ? 'success' : 'error'} variant="outlined">
          {message.text}
        </Alert>
      )}

      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        The render plays the order list through twice — about {seconds.toFixed(1)}s
        — into an offline context, faster than real time and without touching
        the speakers. It works because the audio engine never assumed a live
        context or a React render in the first place.
      </Typography>
    </Stack>
  );
}
