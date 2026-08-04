# deasil
> the front-end of deasil.org

## Programs


show hamburger menu on each page, expand to show icons
- share - social media icons, email icon, link icon (copy link)
- light/dark mode


- top-right button humburger menu
  - (on mobile) main menu (writing, protography, programs)
  - share (facebook, instagram, copy link)
  - light/dark mode

## Writing

### Features

- Articles, Authors, Categories

### Todo

- floating collapsible table of contents


## Photography


### Features

- Lightbox
  - Buy
  - Share - copy link
  - Toggle metadata
  - Close

### Todo

## Programs

### Sundial

#### Features

- Sun clock - time of day
    - icons: sunrise, sunset, solar noon, solar midnight
    - lines: current time of day
    - colors: blue-orange
    - text: morning, midday, evening, night
    - info: twilight, golden hour, blue hour
- Moon clock - monthly cycle
    - icons: phases of the moon
    - lines: current phase of the moon
    - colors: gradient from black to white
    - text: waxing/waning
    - info: current phase, distance, last phase and datetime, next phase and datetime, next eclipse, last eclipse
- Season clock - wheel of the year
    - icons: eight sabbaths
    - lines: current day of the year
    - colors: rainbow
    - text: seasons (4), months (12)?
    - info: ??
- Star clock - astrology
    - icons: 12 astrological symbols
    - lines: sun, moon, planets
    - colors: mutable/fixed?
    - text: ?
    - info: ?


#### Errors

- sun clock coloration should be yellow (morning)

#### Todo

- Add/move/remove clocks
- Allow user to download svg for specific clock, or all clocks
- Datetime controls
  - Show calendar and play/pause icons - calendar allows the user to set a particular datetime, play sets it to the preset
  - Set location manually
- important events in history that happened today?
- ecospiritual reflection?
- day of the week?

### Altar

#### Features

- Tarot cards and spreads

#### Todo

- allow entering of a prompt, use with reading or seed to random number generator
- use quantum random number generator
- reading - use browser's AI or use google cloud services
- card types
  - Runes - Eldar Futhark, Younger Futhark, Anglo-Saxon
  - Lenormand?
  - Playing cards - use tarot correspondances
- browse cards - all, minor/major, element
- info box
  - Datasets used
    - [Kaggle - Tarot Deck](https://www.kaggle.com/datasets/lsind18/tarot-json/data)
    - [Kaggle - Tarotoo Tarot Card Meanings](https://www.kaggle.com/datasets/tarotoo/tarotoo-tarot-card-meanings)
    - Not used: [Kaggle - Complete Tarot Card Meanings](https://www.kaggle.com/datasets/morrispoint/complete-tarot-card-meanings-all-78-cards), scraped from [here?](https://deckaura.com/blogs/guide/fool-tarot-meaning)



### Glyph

- add runes/ogham to altar

Very little historiocity. Glyph in an app to work with ancient character sets, translating from English

- Included character sets
  - Greek - upper and lowercase
  - Norse Runes - elder futhark, younger futhark, anglo saxon, short-twig, staveless
  - 
- Preset names, show english, romanization, and original language
  - Germanic - Thor (ᚦᛟᚱ), Odin (ᛟᛞᛁᚾ)
  - Ogham - Cernunnos
  - Greek - Chaos (χάος), Odysseus
  - Not only Gods but words for "river", "earth", "time"


### Voluspa

#### Features

- view full text, stanza comparison

#### Todo

- hide individual stanza view, user can just use comparison view
- show icons for views instead of text
- put the stanza arrows in a row with the full text / comparison buttons allow the user between 
- expand/collapse stanzas when comparing translations
- quality control - make sure stanzas match up, add newlines to introductions and format them better
- clearer citations