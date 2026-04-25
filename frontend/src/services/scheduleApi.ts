import axios from "axios";
import { api, USE_MOCK } from "./api";
import {
  mockCreateSchedules,
  mockGetScheduleDetail,
  mockListSchedules,
} from "./mock";
import type {
  ApprovedEvent,
  ConflictResponse,
  Schedule,
  ScheduleDetail,
} from "@/types/api";

export class ScheduleConflictError extends Error {
  constructor(public payload: ConflictResponse) {
    super(payload.detail);
    this.name = "ScheduleConflictError";
  }
}

export async function createSchedules(
  noteId: string,
  events: ApprovedEvent[],
): Promise<Schedule[]> {
  if (USE_MOCK) return mockCreateSchedules(noteId, events);
  try {
    const { data } = await api.post<Schedule[]>("/api/schedules", {
      note_id: noteId,
      events,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new ScheduleConflictError(error.response.data as ConflictResponse);
    }
    throw error;
  }
}

export async function listSchedules(): Promise<Schedule[]> {
  if (USE_MOCK) return mockListSchedules();
  const { data } = await api.get<Schedule[]>("/api/schedules");
  return data;
}

export async function getScheduleDetail(
  scheduleId: string,
): Promise<ScheduleDetail> {
  if (USE_MOCK) return mockGetScheduleDetail(scheduleId);
  const { data } = await api.get<ScheduleDetail>(
    `/api/schedules/${scheduleId}`,
  );
  return data;
}
