"use client";

import { create } from "zustand";
import { mockGames, type WorldcupGame } from "@/lib/worldcup";

export type AppView = "home" | "create" | "profile" | "lobby" | "play" | "result" | "ranking";

export type Player = {
  id: number;
  name: string;
  avatar: string;
  isHost?: boolean;
};

type WorldcupUiState = {
  view: AppView;
  selectedGameId: number;
  roomCode: string | null;
  players: Player[];
  setView: (view: AppView) => void;
  selectGame: (gameId: number, view?: AppView) => void;
  enterLobby: (roomCode: string, players: Player[]) => void;
  setRoomContext: (roomCode: string, players: Player[]) => void;
  setPlayers: (players: Player[]) => void;
  selectedGame: () => WorldcupGame;
};

export const useWorldcupStore = create<WorldcupUiState>((set, get) => ({
  view: "home",
  selectedGameId: mockGames[0].id,
  roomCode: null,
  players: [],
  setView: (view) => set({ view }),
  selectGame: (selectedGameId, view = "profile") => set({ selectedGameId, view }),
  enterLobby: (roomCode, players) => set({ roomCode, players, view: "lobby" }),
  setRoomContext: (roomCode, players) => set({ roomCode, players }),
  setPlayers: (players) => set({ players }),
  selectedGame: () =>
    mockGames.find((game) => game.id === get().selectedGameId) ?? mockGames[0],
}));
