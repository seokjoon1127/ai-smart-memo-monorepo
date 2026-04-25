/**
 * mockApi.memo.parse 응답 분기.
 * content 안의 키워드를 substring 검사해서 시나리오를 고른다.
 *
 * 매치 우선순위: 위에서부터 첫 번째로 trigger가 매치되는 것.
 * 어느 것도 매치되지 않으면 events: [] 응답.
 *
 * conflict 정보는 mockSchedules의 4/23 15:00 팀 스탠드업과 일치하도록 박아둠.
 */

import type { ParsedEvent } from "@/types/api";

export interface ParseScenario {
  trigger: string;
  events: ParsedEvent[];
}

export const parseScenarios: ParseScenario[] = [
  {
    trigger: "김팀장",
    events: [
      {
        temp_id: "evt_tmp_1",
        title: "김팀장 회의",
        date: "2026-04-23",
        is_all_day: false,
        start_time: "15:00",
        end_time: null,
        type: "meeting",
        participants: ["김팀장"],
        location: null,
        conflict: {
          has_conflict: true,
          conflicting_event: "팀 스탠드업 15:00~15:30",
          suggested_times: ["15:30", "16:00", "16:30"],
        },
      },
      {
        temp_id: "evt_tmp_2",
        title: "보고서 제출",
        date: "2026-04-25",
        is_all_day: true,
        start_time: null,
        end_time: null,
        type: "deadline",
        participants: [],
        location: null,
        conflict: { has_conflict: false },
      },
    ],
  },
  {
    trigger: "클라이언트",
    events: [
      {
        temp_id: "evt_tmp_1",
        title: "클라이언트 미팅",
        date: "2026-04-28",
        is_all_day: false,
        start_time: "14:00",
        end_time: null,
        type: "meeting",
        participants: [],
        location: "강남 사무실",
        conflict: { has_conflict: false },
      },
    ],
  },
];
