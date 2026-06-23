// src/lib/axios.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3002",
  withCredentials: true,
});