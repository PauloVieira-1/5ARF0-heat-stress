# Herd Heat Monitor

Proof-of-concept dashboard for the 5ARF0 (Ethics of AI: Theory and Practice) Group A report, "Detecting Heat Stress in Dairy Cows: An AI Decision Support System for Dutch Farms". All cow data is sample data.

- Live version: https://paulovieira-1.github.io/5ARF0-heat-stress/
- Claude artifact: https://claude.ai/artifact/JTyYAUtfuPwGb2Y6tHPMYV
- Sources and citations: the faint "Sources" link in the footer, or `#sources`.
- The report is the source of truth. The dashboard may add detail but must not contradict it.

## Files

- `src/1-layout.html`: title, styles and page markup
- `src/2-model.js`: sample-data simulation (THI curve, cows, likelihood model)
- `src/3-app.js`: views, check flow, sources and citations
- `dashboard.html`: built page, published as the Claude artifact
- `index.html`: standalone built page, served by GitHub Pages

## Build

```sh
./build.sh
```
