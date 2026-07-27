전북대학교·원광대학교 JST 공유대학 원격 AI 작업실 학생용 파일

1. 학생용 ZIP을 내려받아 둡니다.
2. PowerShell을 엽니다.
3. 교재 1장대로 Git, Node.js, Python, Claude Code를 설치합니다.
4. naia-adk를 $HOME\naia-adk에 복제하고 수업 기준 커밋 a3f01f5를 선택합니다.
5. Windows 탐색기에서 학생용 ZIP을 마우스 오른쪽 버튼으로 누르고 모두 압축 풀기를 선택합니다.
6. 압축을 풀 위치에 %USERPROFILE%\naia-adk를 입력합니다.
7. data-company, data-private, .agents, tools, workshop-files 폴더가 합쳐지도록 압축을 풉니다.
8. 내 개인 Discord 서버와 내 봇을 만든 뒤 Claude Code에게 Discord 감시를 시작해 달라고 요청합니다.
9. workshop-files의 초기창업패키지 HWP를 개인 서버에 보내 최종 HWPX를 받습니다.

학생이 실행할 자동 데이터 입력·사전 점검 PS1은 없습니다. 학생용 ZIP 전체를 naia-adk에 한 번에 풉니다.
학교 API 설정은 .claude\settings.local.json에 저장하면 Claude Code가 시작할 때 자동으로 읽습니다.
Discord 설정은 data-private\discord-claude\.env에 저장하면 Discord 작업기가 시작할 때 직접 읽습니다.
현재 수업 기준 naia-adk에는 proposal-writing이 기본 포함되어 있지 않아 학생용 ZIP이 .agents\skills\proposal-writing에 추가합니다.
tools\discord-claude는 수업용 Discord 감시 프로그램이며 학생용 ZIP이 정확한 위치에 넣습니다.
.agents\skills\monitor-discord는 Claude Code가 이 감시 프로그램을 설치하고 시작하는 절차입니다.
제안서 스킬 폴더 안의 변환 스크립트는 Claude Code가 HWPX 작업 중 내부적으로 사용하는 파일이므로 학생이 직접 실행하지 않습니다.
실제 API 키와 Discord 토큰은 학생 ZIP이나 GitHub에 저장하지 마세요.
