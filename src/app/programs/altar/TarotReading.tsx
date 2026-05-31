"use client";
import { useState } from 'react';
import tarot from './tarot-images.json';
import Image from 'next/image';
import { Button, Checkbox, FormControlLabel, Box, Typography, Grid, Card, CardContent, CardMedia, Container } from '@mui/material';
import NumberField from '../../components/NumberField';

// Define the type for a card based on the JSON structure
interface CardData {
  name: string;
  img: string;
  keywords: string[];
  meanings: {
    light: string[];
    shadow: string[];
  };
  desc: string;
}

interface DrawnCard extends CardData {
  isReversed: boolean;
}

export default function TarotReading() {
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [numCards, setNumCards] = useState(1);
  const [allowReversals, setAllowReversals] = useState(true);

  const drawCards = () => {
    const newDrawnCards: DrawnCard[] = [];
    const availableCards = [...tarot.cards];

    for (let i = 0; i < numCards; i++) {
      if (availableCards.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const card = availableCards.splice(randomIndex, 1)[0] as CardData;
      const isReversed = allowReversals && Math.random() < 0.5;
      newDrawnCards.push({ ...card, isReversed });
    }
    setDrawnCards(newDrawnCards);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Tarot Reading
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <NumberField
            label="Number of Cards"
            value={numCards}
            onValueChange={(val) => setNumCards(val ?? 1)}
            min={1}
            max={tarot.cards.length}
            sx={{ width: 175 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={allowReversals}
                onChange={(e) => setAllowReversals(e.target.checked)}
              />
            }
            label="Allow Reversals"
          />
          <Button variant="contained" onClick={drawCards}>Draw Cards</Button>
        </Box>
        <Grid container spacing={3} justifyContent="center">
          {drawnCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardMedia>
                  <Image
                    src={`/tarot-images/${card.img}`}
                    alt={card.name}
                    width={200}
                    height={350}
                    style={{
                      transform: card.isReversed ? 'rotate(180deg)' : 'none',
                      display: 'block',
                      margin: 'auto',
                      filter: 'sepia(0.5)',
                    }}
                  />
                </CardMedia>
                <CardContent>
                  <Typography variant="h5">{card.name} {card.isReversed ? '(Reversed)' : ''}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Keywords:</strong> {card.keywords.join(', ')}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {!allowReversals ? (
                      <>
                        <Typography variant="body2"><strong>Light Meanings:</strong></Typography>
                        <ul>
                          {card.meanings.light.map((meaning, i) => <li key={i}><Typography variant="body2">{meaning}</Typography></li>)}
                        </ul>
                        <Typography variant="body2"><strong>Shadow Meanings:</strong></Typography>
                        <ul>
                          {card.meanings.shadow.map((meaning, i) => <li key={i}><Typography variant="body2">{meaning}</Typography></li>)}
                        </ul>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2"><strong>Meaning:</strong></Typography>
                        <ul>
                          {(card.isReversed ? card.meanings.shadow : card.meanings.light).map((meaning, i) => (
                            <li key={i}><Typography variant="body2">{meaning}</Typography></li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
