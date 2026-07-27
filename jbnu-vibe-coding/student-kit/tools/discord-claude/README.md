# Discord–Claude Code 작업자

지정한 Discord 서버·채널의 사람 메시지를 받습니다. 별도 명령어는 필요하지 않습니다. 사용자 계정이나 사용자 토큰은 사용하지 않으며 봇이 보낸 메시지는 무시합니다. 첨부는 `data-private/discord-claude/inbox/`, 결과는 `outbox/`에 저장하고 Discord로 돌려줍니다.

## 수업의 원격 미션

- HWP/HWPX를 첨부하고 자연어로 제안서 작성을 요청하면 최종 교육용 HWPX 생성

홈페이지는 먼저 로컬 Claude Code에서 만들고 GitHub Pages에 배포합니다. Discord에서는 별도 미션인 제안서 작성만 진행합니다.

학생용 ZIP을 `naia-adk`에 풀면 제안서 스킬은 `naia-adk/.agents/skills/proposal-writing`에 함께 들어갑니다. 학생이 별도 설정용 PS1을 실행하지는 않습니다. HWPX 변환에 필요한 내부 명령은 Claude Code가 제안서 작성 절차에 따라 수행합니다.

## Discord 설정

학교 API 연결값은 Claude Code 표준 설정인 `naia-adk\.claude\settings.local.json`에 둡니다. Discord 값은 다음과 같이 별도로 저장합니다.

```text
naia-adk\data-private\discord-claude\.env
```

작업자는 시작할 때 Discord 전용 `.env`를 직접 읽습니다. PowerShell에서 별도로 불러올 필요가 없습니다.

## 실행

```powershell
cd "$HOME\naia-adk"
node .\tools\discord-claude\worker.mjs --workspace .
```

`watching`과 `ready as`가 나오면 감시 중입니다. 종료는 `Ctrl+C`입니다.

## 안전 경계

- 첨부는 최대 5개, 파일당 12MB
- 문서와 PNG/JPEG/WebP만 허용
- 토큰·키는 Claude 자식 프로세스에서 제거
- 외부 게시·Git push·실제 신청 금지
- 최종 문서 형식은 HWPX, 보조 근거 파일은 evidence.md
- 새 첨부는 새 세션
- 첨부 없는 후속 요청은 마지막 작업 후 30분 미만일 때만 세션 재사용
- 30분 이상 유휴 상태이면 새 세션으로 회전하며, 유휴 중 모델 호출 없음
- 한 작업자는 지정한 서버·채널 한 조합에만 연결
