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

/**
 * Context for Gemini API access throughout the app
 */
import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";
import { LiveClientOptions } from "../types";

/**
 * React Context for the Gemini Live API
 * 
 * This context provides access to the Gemini API client and related functionality
 * throughout the component tree without prop drilling.
 * 
 * It exposes:
 * - client: The Gemini API client instance
 * - connect/disconnect: Functions to start/stop the connection
 * - connected: Whether the client is currently connected
 * - setConfig: Function to configure the Gemini AI behavior
 * - setModel: Function to set which Gemini model to use
 * - volume: Audio output volume for visualizations
 */
const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

/**
 * Props for the LiveAPIProvider component
 * @property {ReactNode} children - Child components that will have access to the context
 * @property {LiveClientOptions} options - Configuration options for the Gemini API client
 */
export type LiveAPIProviderProps = {
  children: ReactNode;
  options: LiveClientOptions;
};

/**
 * Provider component that makes Gemini API available to all children
 * 
 * Wrap your app with this to provide Gemini functionality
 */
export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  options,
  children,
}) => {
  // Initialize the Gemini API
  const liveAPI = useLiveAPI(options);

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

/**
 * Hook to access Gemini API in any component
 * 
 * Usage:
 * const { client, connected, connect, disconnect } = useLiveAPIContext();
 */
export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used within a LiveAPIProvider");
  }
  return context;
};
