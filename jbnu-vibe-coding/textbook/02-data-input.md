# 2. 가상 회사 정보와 개인정보 입력 \[10분]

## 목표

학생용 ZIP을 `naia-adk`에 한 번에 풀어 가상 자료와 수업 도구를 제자리에 넣고, `data-company`와 `data-private`를 왜 분리하는지 이해합니다.

## 먼저 구분하기

| 구분             | 넣는 자료                | 예시                           | Git 공개            |
| -------------- | -------------------- | ---------------------------- | ----------------- |
| `data-company` | 회사 구성원이 업무에 함께 쓰는 자료 | 회사 소개, 제품, 브랜드 색상, 공개 가능한 실적 | 실제 사용 시 공개 범위를 확인 |
| `data-private` | 개인 또는 제한된 사람만 볼 자료   | 대표자 연락처, 개인 주소, 생년 정보        | 금지                |

폴더 이름이 보안을 자동으로 보장하지는 않습니다. AI에게 자료의 성격을 알려주고, 사람이 공개 범위를 판단하기 위한 구조입니다.

## 2-1. 학생용 ZIP을 naia-adk에 풀기

1. 0장 OT에서 내려받은 `jeonju-naia-student-kit.zip`을 찾습니다.
2. ZIP을 마우스 오른쪽 버튼으로 누르고 `압축 풀기` 또는 `모두 압축 풀기`를 선택합니다.
3. 압축을 풀 위치에 `%USERPROFILE%\naia-adk`를 입력합니다.
4. `압축 풀기`를 누릅니다.
5. 같은 이름의 폴더를 합칠지 물으면 `예` 또는 `계속`을 누릅니다.

이 ZIP은 다음 구조로 준비되어 있으므로 naia-adk 에 그냥 풀어두시면 됩니다.

```text
naia-adk
├─ data-company\workshop       가상 회사 문서와 이미지
├─ data-private\workshop       가상 대표자 개인정보
├─ .agents\skills\proposal-writing
│                               제안서 작성 절차
├─ .agents\skills\monitor-discord
│                               Discord 감시 시작 절차
├─ tools\discord-claude        수업용 Discord 감시 프로그램
└─ workshop-files              초기창업패키지 HWP 양식
```

> 화면 캡처 위치: 압축 풀기 창에서 대상 폴더가 `%USERPROFILE%\naia-adk`로 입력된 화면

## 2-2. 들어간 위치 확인하기

파일 탐색기 주소창에 `%USERPROFILE%\naia-adk`를 입력하고 다음 경로를 차례로 엽니다.

```text
data-company\workshop\company.md
data-company\workshop\company-design.md
data-company\workshop\achievements.md
data-company\workshop\proposal-plan.md
data-company\workshop\assets\PNG 파일 4개
data-private\workshop\profile.md
.agents\skills\proposal-writing\SKILL.md
.agents\skills\monitor-discord\SKILL.md
tools\discord-claude\worker.mjs
workshop-files\2026년도 초기창업패키지 사업계획서 양식.hwp
```

현재 수업 기준의 `naia-adk`에는 `proposal-writing`이 기본으로 들어 있지 않습니다. 이 스킬은 학생용 ZIP이 `.agents\skills\proposal-writing`에 추가합니다. 공식 양식 분석, 근거 확인, HWPX 납품 순서가 적혀 있으며 5장에서 Claude Code가 읽고 사용합니다. 학생이 그 안의 변환용 PowerShell 파일을 직접 실행하지 않습니다.

`monitor-discord` 스킬은 Claude Code가 Discord 감시를 시작하는 순서를 알려주고, `tools\discord-claude`는 실제로 메시지를 기다렸다가 Claude Code에 전달합니다. 학생은 4장에서 Claude Code에게 감시를 시작해 달라고 말하면 됩니다.

> 화면 캡처 위치: `naia-adk` 안에 `data-company`, `data-private`, `.agents`, `tools`가 함께 보이는 화면

## 2-3. 마크다운 파일 이해하기

확장자가 `.md`인 파일은 **마크다운(Markdown)** 형식의 텍스트 파일입니다. 제목, 목록, 표처럼 문서 구조를 간단한 기호로 표시하지만, 내용 자체는 일반 글자이므로 메모장으로도 열 수 있습니다. 보통은 옵시디언(Obsidian)이나 코딩 도구의 편집기에서 열면 제목과 표를 더 보기 좋게 확인할 수 있습니다.

이 수업에서는 별도의 편집기를 설치하지 않아도 Claude Code가 마크다운 파일을 읽고 수정할 수 있습니다. 향후 연계할 **Naia Shell**에서는 워크스페이스 화면에서 `data-company`와 `data-private`의 마크다운 문서를 직접 찾아보고 열 수 있게 할 예정입니다.

> 화면 캡처 위치: Naia Shell 워크스페이스에서 마크다운 문서를 찾아보는 화면

## 2-4. 가상 회사 살펴보기

* 회사명: 모두봄랩 주식회사
* 대표자: 김나래
* 제품: 소상공인을 위한 쉬운 원페이지 홈페이지 제작 도우미 `봄봇`
* 디자인: 봄빛 초록, 따뜻한 산호색, 짙은 먹색, 크림색
* 이미지: PNG 로고, 제품 화면, 고객 인터뷰, 교육 활동
* 실적: 모두 교육용으로 만든 가상 기록

`company.md`는 홈페이지와 제안서가 함께 참고하는 사실의 기준입니다. `company-design.md`는 홈페이지의 시각 방향을 설명합니다. `achievements.md`는 과거의 교육용 가상 활동이고, `proposal-plan.md`는 미래 계획 가정입니다. `profile.md`는 제안서에 필요한 대표자 정보이며 홈페이지 미션에는 사용하지 않습니다.

## 2-5. Claude Code에게 구조 설명시키기

```powershell
cd $HOME\naia-adk
claude
```

Claude Code에 다음을 입력합니다.

```text
data-company/workshop과 data-private/workshop의 파일 목록만 확인하고,
두 폴더를 왜 분리하는지 초보자에게 5문장으로 설명해줘.
파일은 수정하지 마.
```

## 실제 회사에 적용할 때

수업이 끝난 뒤에는 가상 회사 자료를 본인의 회사 정보로 바꿔 사용할 수 있습니다. 각 마크다운 파일을 메모장으로 열어 회사명, 제품, 대표자 정보와 사진을 바꾸면 됩니다.

## 완료 확인

* [ ] 회사 파일 4개와 PNG 이미지가 `data-company\workshop`에 있다.
* [ ] 대표자 파일은 `data-private\workshop`에만 있다.
* [ ] 모든 샘플에 `교육용 가상 정보` 표시가 있다.
* [ ] API 키는 `.claude\settings.local.json`, Discord 토큰은 `data-private\discord-claude\.env`에 있고 가상 회사·개인정보 파일에는 없다.
