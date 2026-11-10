# golf-app
Golf performance tracking web application

## Development
Install Node.js 22 or later, then run `npm install` and `npm run dev`.
Run `npm run build` to create the production files in `dist`.

## Deployment
Push changes to `main` to run the GitHub Pages workflow. In repository Settings > Pages, select GitHub Actions as the source if automatic enablement fails. The intended address is https://bawby123.github.io/golf-app/ . Hash routing supports refreshing nested views.

## Initial version
Includes manual shot recording, club selection, lie and direction, putts, penalties, undo, hole navigation, scorecards, round history, average recorded club distances, bag editing, local browser persistence and JSON backup export.

The practice course and hole distances are explicitly sample data. The Pebble Beach photograph comes from the supplied Figma design and is illustrative. GPS, real course directory, weather, coordinate-based dispersion, authentication and cloud synchronization are not implemented. Full Figma parity and complete browser journey testing remain outstanding. Data is stored only in the current browser; export a backup before clearing browser data.
