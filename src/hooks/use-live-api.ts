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
 * Hook that provides access to the Gemini Live API
 */
export type UseLiveAPIResults = {
  client: GenAILiveClient;         // The Gemini API client
  setConfig: (config: LiveConnectConfig) => void; // Change Gemini's settings
  config: LiveConnectConfig;       // Current settings
  model: string;                   // Current model name
  setModel: (model: string) => void; // Change which model to use
  connected: boolean;              // Whether we're connected to Gemini
  connect: () => Promise<void>;    // Connect to Gemini
  disconnect: () => Promise<void>; // Disconnect from Gemini
  volume: number;                  // Audio volume level (for visualization)
};

/**
 * Hook to use Gemini Live API
 * 
 * @param options - Configuration with API key
 * @returns Everything needed to interact with Gemini
 */
export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  // Create the Gemini client
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  
  // For playing Gemini's voice responses
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  // Keep track of model and configuration
  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({});
  
  // Track connection status and audio volume
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // Set up audio playback
  useEffect(() => {
    if (!audioStreamerRef.current) {
      // Create audio context
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        // Create audio streamer
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        
        // Add volume meter
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Worklet added successfully
          });
      });
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    // When connection is established
    const onOpen = () => {
      setConnected(true);
    };

    // When connection is closed
    const onClose = () => {
      setConnected(false);
    };

    // When an error occurs
    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    // Stop audio when connection is interrupted
    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    // Process incoming audio from Gemini
    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    // Register all event listeners
    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    // Clean up when component unmounts
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

  // Connect to Gemini
  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    // Make sure we're disconnected first
    client.disconnect();
    // Connect with current model and config
    await client.connect(model, config);
  }, [client, config, model]);

  // Disconnect from Gemini
  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [client]);

  // Return everything
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
