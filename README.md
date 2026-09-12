# Forma — AI Fitness Coach

A responsive, privacy-first live coaching screen built with React, TypeScript, Vite, TensorFlow.js, and MoveNet Lightning.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL, choose an exercise, and select **Start camera**. Camera access requires a secure context (`https://` or `localhost`).

## What is implemented

- Real-time MoveNet pose detection in the browser
- Volt skeleton and joint overlay on the mirrored camera feed
- Angle-driven rep state machines for squats, curls, and presses
- Live form scoring and corrective caption cues
- Optional Web Speech API voice cues
- Animated reference-rep joint tracks for each exercise
- Exercise selector, set progress, live stats, and session summary
- Mobile/phone-stand layout, keyboard focus states, readable high-contrast mode, and reduced-motion support

## Privacy

Camera frames are passed directly from `getUserMedia` to TensorFlow.js and discarded after inference. Forma does not record, persist, or send video frames to a server. The MoveNet model is downloaded by TensorFlow.js on first use; all pose inference and form analysis then run on the device.

## Production build

```bash
npm run build
npm run preview
```
