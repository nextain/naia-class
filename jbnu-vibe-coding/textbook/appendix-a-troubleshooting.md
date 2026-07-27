# 부록 A. 문제 해결표

| 증상 | 먼저 확인 | 해결 |
|---|---|---|
| `winget` 없음 | 앱 설치 관리자 | Microsoft Store에서 갱신 |
| 설치 뒤 명령 없음 | 예전 PowerShell | 모든 창을 닫고 새로 열기 |
| `claude`가 Desktop을 엶 | `where.exe claude` | Desktop 갱신, 중복 설치 정리 |
| Git Bash를 못 찾음 | Git for Windows | Git 재설치 |
| FactChat 401/403 | 키 만료·공백 | 새 키 확인·재입력 |
| FactChat 404 | base URL | `/v1/gateway/claude` 확인 |
| 인증 충돌 | `ANTHROPIC_API_KEY` | 해당 환경변수 제거 |
| Claude 연결 설정이 적용되지 않음 | 설정 파일 위치·JSON 문법 | `naia-adk\.claude\settings.local.json`의 큰따옴표와 쉼표 확인 |
| Discord 침묵 | Message Content Intent | Portal에서 켜기 |
| 잘못된 채널 | 숫자 ID | 개발자 모드로 재복사 |
| 첨부 거부 | 형식·개수·크기 | 허용 형식, 5개·각 12MB |
| HWP 추출 실패 | `hwp5html --help` | pyhwp 재설치 |
| HWPX가 생성되지 않음 | `proposal-writing` 폴더·한글 설치 | `.agents\skills\proposal-writing`이 있는지 확인하고 도우미 에이전트에 작업자 오류를 그대로 질문 |
| HWPX는 있으나 열리지 않음 | 파일 크기·재검증 결과 | 원본을 보존하고 같은 요청에서 HWPX 재생성과 재검증 요청 |
| 홈페이지 골격만 생성 | 요청의 완료 조건 | 부록 B 사용 |
| 대화가 안 이어짐 | 새 첨부 여부 | 새 첨부는 새 세션, 수정은 첨부 없이 |
| 교재 ZIP 404 | 표지 다운로드 링크 | 강사에게 ZIP 직접 전송 요청 |

## 안전한 초기화

키·토큰이 노출됐다면 즉시 재발급합니다. PowerShell을 닫는 것만으로 이미 노출된 비밀은 되돌릴 수 없습니다.

세션만 새로 시작하려면 작업자를 종료하고 실행합니다.

```powershell
Remove-Item "$HOME\naia-adk\data-private\discord-claude\state.json" -ErrorAction SilentlyContinue
```

inbox·outbox는 필요한 결과를 확인한 뒤 사람이 정리합니다.
