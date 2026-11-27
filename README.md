# MyCaddie

Golf performance tracking interface built with React, Vite, JavaScript, CSS, React Router and Recharts.

Live website: https://bawby123.github.io/golf-app/

## Run locally

Install Node.js 22 or later, then run `npm install` and `npm run dev`.
Run `npm run build` for the production build and `node --test src/gps.test.js src/round.test.js` for recording and distance checks.

## Controls

Choose the Garden Course and start a round. Tap the club button to open the club selection screen. Record shot marks a GPS start; walk to the ball and tap Save shot to capture the endpoint and add one stroke. The distance counter updates while measuring. Browser location permission and a suitable outdoor GPS signal are required. GPS errors offer manual distance entry; this can also be opened directly while measuring.

The hole button opens all 18 selectable tiles. Completed holes show a green tick and can be revisited. Scorecard opens each hole's shot list and editing controls. More contains penalties, undo and early round ending. Cancelling a measurement leaves saved strokes intact. Saved rounds and preferences persist in this browser; export a JSON backup from Profile > Your name & data backup.

## Design and data

The interface follows page 05 of the supplied Figma file: https://www.figma.com/design/Qcxqc3nCEDbNNLHaD7u77X/2502-Golf-App?node-id=109-536

Club selection, manual distance, hole selection and recovery actions use separate screens and buttons, without native dropdowns or accordion forms. Recording screens use the 390 x 844 reference proportions, with a smaller map on short screens.

The satellite artwork is the supplied Figma export of Esri World Imagery centred on Tanah Merah Garden Course. It is a static preview with provider attribution, not a live location map or a Google Maps integration. Browser GPS operates independently and measures straight-line distance between the start and endpoint, not accumulated walking distance. Accuracy depends on the device and surroundings; fixes worse than 50 metres are rejected. Measurements include roll and do not measure carry or lateral dispersion.

Course information uses the published 2025 Garden Course White tees scorecard: https://www.tmcc.org.sg/wp-content/uploads/2025/04/2025_Garden-Course-Scorecard.pdf . Daily tee positions may differ. Performance charts and club averages use saved user data; incomplete rounds do not enter the 18-hole scoring average. Weather and wind are manually selected. No authentication, cloud sync or live weather service is connected.

## Deployment

Push to main to build and deploy with GitHub Actions. GitHub Pages uses the GitHub Actions source, Vite uses /golf-app/, and hash routing supports refreshing nested views. The workflow waits for uploaded artifact metadata before publishing.

## Golf identity review — November 2026

The golf identity adds a vector flag/green logo, a forest-green and ivory visual theme, fairway illustration, clearer button states, navigation icons and a wider desktop home layout. The recording and storage logic is unchanged. The previous Figma-aligned version is commit `287858d`. To restore that appearance after review, revert the single golf-identity commit rather than resetting history; saved browser data is independent of this visual change.
