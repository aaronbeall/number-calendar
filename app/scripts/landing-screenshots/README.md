# Landing page screenshots

The screenshots in `src/assets/landing/` are captured from the real app with the sample data in
`seed.cjs` (Trading P&L, Weight, Steps, Sleep for Jan to Oct 2026) and the goals in `goals.json`
(made with the in-app goal builder). The clock is frozen at 31 Oct 2026 so October is a full month.

To regenerate after a UI change:

```sh
npm run dev                                   # in another terminal, on port 5173
node scripts/landing-screenshots/capture.cjs  # writes raw PNGs to scripts/landing-screenshots/raw/
python3 scripts/landing-screenshots/crop.py   # needs Pillow; writes light and dark .webp crops
```

The crop boxes in `crop.py` are pixel positions in the raw captures; check them if layouts move.
Note: this wipes the `number-calendar` IndexedDB in the Playwright browser profile only.
