/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { LiveConnectConfig } from "@google/genai";

/**
 * Return type for the useLiveAPI hook
 */
export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

/**
 * Custom hook that provides access to the Gemini Live API
 * Sets up and manages the connection to Gemini, handles audio streaming,
 * and provides methods to control the interaction
 */
export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  // Create the Gemini client instance (memoized to prevent recreation)
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  // Reference to the audio streamer for playing Gemini's voice responses
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  // Default model is Gemini 2.0 Flash Experimental
  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  // Configuration for the Gemini AI (system instructions, tools, etc.)
  const [config, setConfig] = useState<LiveConnectConfig>({});
  // Track connection state to Gemini
  const [connected, setConnected] = useState(false);
  // Track output volume for visualizations
  const [volume, setVolume] = useState(0);

  // Set up audio streaming for Gemini's voice responses
  useEffect(() => {
    if (!audioStreamerRef.current) {
      // Create audio context for playing sound
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        // Initialize audio streamer with the context
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        // Add volume meter to track and visualize audio levels
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  // Set up event listeners for the Gemini client
  useEffect(() => {
    // When connection is established
    const onOpen = () => {
      setConnected(true);
    };

    // When connection is closed
    const onClose = () => {
      setConnected(false);
    };

    // Handle connection errors
    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    // Stop audio playback when connection is interrupted
    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    // Process incoming audio data from Gemini
    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    // Register all event handlers
    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    // Cleanup function to remove event handlers when component unmounts
    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  // Function to connect to Gemini
  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    // Ensure any existing connection is closed
    client.disconnect();
    // Connect with the current model and configuration
    await client.connect(model, config);
  }, [client, config, model]);

  // Function to disconnect from Gemini
  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  // Return the API client and helper methods/state
  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
