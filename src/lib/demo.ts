// 시연 데이터: 이 앱을 위해 새로 쓴 합성 예문입니다. 실제 교재 내용·작업 절차·기준값이 아닙니다.
import { buildImport } from "./parser";
import type { Dataset, Note } from "./types";

export const DEMO_PATTERN_TXT = `Pattern 001
Could you hand me the ~?
~ 좀 건네주시겠어요?
∙ 동료에게 물건을 정중하게 부탁할 때 쓰는 표현입니다. (시연용)
001 Could you hand me the flashlight on the bench?
002 Could you hand me the binder when you
have a moment?
[Words & Phrase]
⬩ flashlight 손전등
⬩ bench 작업대
⬩ binder 바인더, 서류철
[Translation]
001 작업대 위의 손전등 좀 건네주시겠어요?
002 시간 되실 때 바인더 좀
건네주시겠어요?

- 1 -

Pattern 002
I'll double-check the ~.
~을 다시 확인하겠습니다.
∙ 한 번 더 확인하겠다고 알릴 때 씁니다. (시연용)
003 I'll double-check the label on the toolbox.
004 I'll double-check the schedule with the team leader.
[Words & Phrase]
⬩ label 라벨, 표시
⬩ toolbox 공구함
⬩ team leader 팀장
[Translation]
003 공구함의 라벨을 다시 확인하겠습니다.
004 팀장님과 일정을 다시 확인하겠습니다.

Pattern 003
Where should I put the ~?
~은 어디에 둘까요?
∙ 물건을 둘 자리를 물을 때 씁니다. (시연용)
005 Where should I put the spare gloves?
006 Where should I put the FOD bag after the shift?
[Words & Phrase]
⬩ spare 여분의
⬩ gloves 장갑
⬩ FOD (Foreign Object Debris) 이물질
⬩ shift 근무 교대
[Translation]
005 여분의 장갑은 어디에 둘까요?
006 근무 교대 후에 FOD 봉투는 어디에 둘까요?

- 2 -

Pattern 004
Let me know when ~.
~하면 알려 주세요.
∙ 어떤 상황이 되면 알려 달라고 부탁할 때 씁니다. (시연용)
007 Let me know when the hangar door is open.
008 Let me know when the torque wrench is back on the shelf.
[Words & Phrase]
⬩ hangar 격납고
⬩ torque wrench 토크 렌치
⬩ shelf 선반
[Translation]
007 격납고 문이 열리면 알려 주세요.
008 토크 렌치가 선반에 돌아오면 알려 주세요.

Pattern 005
Is this ~ serviceable?
이 ~ 사용 가능한 상태인가요?
∙ 물품의 상태를 물을 때 씁니다. (시연용)
009 Is this ladder serviceable?
010 Is this extension cord serviceable, or should I
tag it for the supervisor?
[Words & Phrase]
⬩ serviceable 사용 가능한
⬩ ladder 사다리
⬩ tag 꼬리표를 붙이다
⬩ supervisor 감독자, 관리자
[Translation]
009 이 사다리는 사용 가능한 상태인가요?
010 이 연장선은 사용 가능한가요, 아니면 감독자에게
보이도록 꼬리표를 붙일까요?
`;

export const DEMO_GLOSSARY_TXT = `시연용 용어 파트 (합성 데이터)

⬩ Torque Wrench (토크 렌치)
조이는 힘을 눈금이나 신호로 확인할 수 있는 공구.
∙ 예문(시연): Please return the torque wrench to the tool room.
∙ 실제 작업 기준값은 포함하지 않습니다.
⬩ Hangar (격납고)
항공기를 보관하거나 점검하기 위한 큰 건물.
∙ 예문(시연): The hangar is quiet early in the morning.
⬩ FOD (Foreign Object Debris) (이물질)
작업 구역에 있어서는 안 되는 작은 물체를 가리키는 말.
∙ 예문(시연): Everyone joined the FOD walk before lunch.
- 7 -
⬩ Serviceable (사용 가능)
점검 결과 사용해도 되는 상태라는 뜻의 표현.
∙ 예문(시연): The new ladder was marked serviceable.
⬩ Safety Wire/Lock Wire (안전선)
부품이 풀리지 않도록 묶어 두는 가는 철사를 부르는 이름.
∙ 예문(시연): The trainee asked where the safety wire was stored.
⬩ Fastener (체결 부품)
볼트, 너트, 리벳처럼 부품을 서로 고정하는 부품의 통칭.
∙ 예문(시연): Each fastener goes back into its labeled tray.
⬩ Sealant (실런트)
틈을 메우는 데 쓰는 끈적한 재료.
∙ 예문(시연): The sealant tube has a blue cap.
`;

export function demoDataset(): Dataset {
  const r = buildImport(DEMO_PATTERN_TXT, DEMO_GLOSSARY_TXT);
  return { origin: "demo", label: "시연 데이터", patterns: r.patterns, terms: r.terms };
}

export function demoNotes(): Note[] {
  const at = "2026-01-01T00:00:00.000Z";
  const n = (id: string, term: string, meaning: string, example: string): Note => ({
    id,
    term,
    meaning,
    example,
    memo: "시연 데이터 메모",
    updatedAt: at,
  });
  return [
    n("demo-n1", "apron", "계류장", "The visitors waited at the edge of the apron."),
    n("demo-n2", "goggles", "보안경", "Put your goggles in the top drawer."),
    n("demo-n3", "trolley", "운반 카트", "The trolley has one squeaky wheel."),
    n("demo-n4", "logbook", "기록부", "Write your name in the logbook, please."),
    n("demo-n5", "briefing", "브리핑, 사전 설명", "The briefing starts at nine."),
  ];
}
