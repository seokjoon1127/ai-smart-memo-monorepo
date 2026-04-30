import { create } from "zustand";
import {
  isApiError,
  type CreateScheduleEventInput,
  type GoogleCalendarEventResponse,
  type Schedule,
  type ScheduleDetail,
} from "@/types/api";
import { calendarApi, scheduleApi, suggestionApi } from "@/services";
import { useUiStore } from "./uiStore";

export type ScheduleStatus = "idle" | "submitting" | "fetching" | "error";

interface ScheduleState {
  /** 직전 등록 결과 (STEP 3에서 카드로 노출) */
  schedules: Schedule[];
  /** schedule_id → 상세 캐시 */
  scheduleDetails: Record<string, ScheduleDetail>;
  /** 캘린더 뷰용 전체 목록 */
  calendarEvents: Schedule[];
  status: ScheduleStatus;
  errorMessage: string | null;

  createSchedules: (
    events: CreateScheduleEventInput[],
  ) => Promise<Schedule[] | null>;
  fetchScheduleDetail: (id: string) => Promise<void>;
  fetchCalendarEvents: (from: string, to: string) => Promise<void>;
  syncGoogleCalendar: (
    scheduleId: string,
  ) => Promise<GoogleCalendarEventResponse | null>;
  deleteSchedule: (scheduleId: string) => Promise<boolean>;
  acceptSuggestion: (
    suggestionId: string,
    alertMinutesBefore?: number,
  ) => Promise<Schedule | null>;
  reset: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  scheduleDetails: {},
  calendarEvents: [],
  status: "idle",
  errorMessage: null,

  createSchedules: async (events) => {
    set({ status: "submitting", errorMessage: null });
    try {
      const response = await scheduleApi.create({ events });
      set((state) => ({
        schedules: response.schedules,
        calendarEvents: [...state.calendarEvents, ...response.schedules],
        status: "idle",
      }));
      if (response.failed.length > 0) {
        useUiStore
          .getState()
          .showToast(
            `${response.failed.length}개 일정의 캘린더 동기화에 실패했어요`,
          );
      }
      return response.schedules;
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "일정 등록에 실패했어요";
      set({ status: "error", errorMessage: message });
      useUiStore.getState().showToast(message);
      return null;
    }
  },

  fetchScheduleDetail: async (id) => {
    if (get().scheduleDetails[id]) return;
    try {
      const detail = await scheduleApi.getDetail(id);
      set((state) => ({
        scheduleDetails: { ...state.scheduleDetails, [id]: detail },
      }));
    } catch {
      // silently fail — UI shows "연관 문서 없음" 상태로 유지
    }
  },

  fetchCalendarEvents: async (from, to) => {
    set({ status: "fetching", errorMessage: null });
    try {
      const list = await scheduleApi.list({ from, to });
      set({ calendarEvents: list, status: "idle" });
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "일정을 불러오지 못했어요";
      set({ status: "error", errorMessage: message });
    }
  },

  syncGoogleCalendar: async (scheduleId) => {
    try {
      const response = await calendarApi.createGoogleEvent({
        schedule_id: scheduleId,
      });
      set((state) => {
        const updateSchedule = (schedule: Schedule) =>
          schedule.id === scheduleId ? response.schedule : schedule;
        const existingDetail = state.scheduleDetails[scheduleId];

        return {
          schedules: state.schedules.map(updateSchedule),
          calendarEvents: state.calendarEvents.map(updateSchedule),
          scheduleDetails: {
            ...state.scheduleDetails,
            ...(existingDetail
              ? {
                  [scheduleId]: {
                    ...existingDetail,
                    ...response.schedule,
                  },
                }
              : {}),
          },
        };
      });
      return response;
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "Google Calendar에 추가하지 못했어요";
      useUiStore.getState().showToast(message);
      return null;
    }
  },

  deleteSchedule: async (scheduleId) => {
    try {
      await scheduleApi.delete(scheduleId);
      set((state) => {
        const nextDetails = { ...state.scheduleDetails };
        delete nextDetails[scheduleId];

        return {
          schedules: state.schedules.filter(
            (schedule) => schedule.id !== scheduleId,
          ),
          calendarEvents: state.calendarEvents.filter(
            (schedule) => schedule.id !== scheduleId,
          ),
          scheduleDetails: nextDetails,
        };
      });
      return true;
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "일정을 삭제하지 못했어요";
      useUiStore.getState().showToast(message);
      return false;
    }
  },

  acceptSuggestion: async (suggestionId, alertMinutesBefore = 10) => {
    try {
      const schedule = await suggestionApi.accept(suggestionId, {
        alert_minutes_before: alertMinutesBefore,
      });
      set((state) => ({
        calendarEvents: [...state.calendarEvents, schedule],
      }));
      return schedule;
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "AI 제안을 등록하지 못했어요";
      useUiStore.getState().showToast(message);
      return null;
    }
  },

  reset: () =>
    set({
      schedules: [],
      scheduleDetails: {},
      calendarEvents: [],
      status: "idle",
      errorMessage: null,
    }),
}));
