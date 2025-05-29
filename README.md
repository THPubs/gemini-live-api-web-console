# Gemini AI Voice & Video Chat

A simple web app that lets you talk to Gemini AI using your voice and camera.

## Features

- Simple, one-button interface to interact with Gemini AI
- Gemini can see and hear you, but your camera feed stays private (not displayed on screen)
- Clean, distraction-free UI that focuses on the conversation
- Support for visualizing data with graphs when requested

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your Gemini API key:
   ```
   REACT_APP_GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```
   npm start
   ```

## How to Use

1. Click the "Talk to Gemini" button to start
2. Allow microphone and camera access when prompted
3. Speak to Gemini naturally - it can see and hear you even though the camera feed isn't displayed
4. Click the "Stop" button to end the conversation

## Building for Production

To build the app for production:

```
npm run build
```

## License

Licensed under the Apache License, Version 2.0.
