# 4. Discord 연동 \[20분]

## 목표

내 개인 실습용 Discord 서버를 만들고 봇 정보를 `data-private`에 저장한 뒤, Claude Code 작업자를 실행해 인사와 응답을 확인합니다.

## Discord 봇은 무엇인가

봇은 사람이 사용하는 Discord 계정과 다릅니다. 프로그램이 메시지와 첨부파일을 받고 답장을 보내기 위한 계정입니다. 봇 토큰은 봇의 비밀번호이므로 노출되면 즉시 Developer Portal에서 재발급해야 합니다.

## 4-1. 내 개인 실습 서버 만들기

1. Discord 왼쪽 서버 목록 아래의 `+`를 누릅니다.
   ![](assets/image-16.png)
2. `직접 만들기(Create My Own)`를 누릅니다.
   ![](assets/image-17.png)
3. `나와 친구들을 위한 서버`를 선택합니다.
   ![](assets/image-18.png)
4. 서버 이름과 썸네일을 원하는데로 넣어봅니다. 아래는 샘플로 드린 회사 정보를 입력해보았습니다.![](assets/image-20.png)
5. 기본 `일반` 텍스트 채널을 그대로 사용하거나 `ai-work` 채널을 하나 만듭니다.
   ![](assets/image-21.png)![](assets/image-22.png)

## 4-2. 봇 만들기

[Discord Developer Portal](https://discord.com/developers/applications)에서 다음 순서로 진행합니다.

1. `New Application`을 눌러 이름을 만듭니다.
   ![](assets/image-23.png)
   ![](assets/image-25.png)
   ![](assets/image-26.png)
2. 왼쪽 `Bot`에서 봇을 추가하고 토큰을 발급합니다.
   **- 봇 토큰은 아래에서 쓸거니 메모장 띄워서 복사 붙여 놓기 해 둡니다.**
   ![](assets/image-27.png)
   ![](assets/image-28.png)
3. `Privileged Gateway Intents`에서 `Message Content Intent`를 켭니다.
   ![](assets/image-29.png)
4. `OAuth2 → URL Generator`에서 `bot`을 선택합니다.
   ![](assets/image-30.png)
5. 권한은 `View Channels`, `Send Messages`, `Attach Files`, Linke Embeded, `Read Message History `만   선택합니다.
   ![](assets/image-31.png)
6. 생성된 주소를 복사해 브라우저에서 엽니다.
   ![](assets/image-32.png)
7. `서버에 추가`에서 4-1에서 만든 내 개인 실습 서버를 선택하고 승인합니다.
   ![](assets/image-33.png)

![](assets/image-34.png)
![](assets/image-35.png)

![](assets/image-36.png)

이제 AI 에이전트가 봇으로 들어올 수 있는 설정이 모두 되었습니다.

## 4-3. 채널 주소에서 서버 ID와 채널 ID 찾기

서버 ID와 채널 ID는 Discord 채널 주소에서 한 번에 찾는 것이 가장 쉽습니다.

1. 웹 브라우저에서 4-1에 만든 개인 Discord 서버의 작업 채널을 엽니다.
2. 브라우저 주소창의 주소를 복사합니다.
3. 주소는 다음과 같은 모양입니다.

```text
https://discord.com/channels/서버_ID/채널_ID
```

예를 들어 주소가 다음과 같다면:

```text
https://discord.com/channels/1531326891896733796/1531326894644133972
```

값은 이렇게 구분합니다.

```text
서버 ID = 1531326891896733796
채널 ID = 1531326894644133972
```

즉, `/channels/` 다음의 첫 번째 숫자가 서버 ID이고 마지막 숫자가 채널 ID입니다. Discord 데스크톱 앱을 사용 중이라 주소창이 보이지 않으면 브라우저에서 [Discord](https://discord.com/app)를 열어 같은 채널로 들어갑니다.

필요한 값은 세 가지입니다.

* 봇 토큰
* 서버 ID
* 채널 ID

서버 ID와 채널 ID는 다음 단계에서 `data-private\discord-claude\.env` 파일을 메모장으로 열어 입력합니다. 봇 토큰은 Developer Portal에서 복사합니다. 사용자 ID나 사용자 토큰은 사용하지 않습니다. 작업 결과는 사용자 계정이 아니라 초대한 봇의 이름으로 전송됩니다.

> 화면 캡처 위치: 브라우저 주소창의 Discord 채널 주소와 `/channels/서버_ID/채널_ID` 설명이 함께 보이는 화면. 수업 캡처에는 봇 토큰을 넣지 않습니다.

## 4-4. Discord 작업자 위치 확인과 설치

2장에서 학생용 ZIP을 `naia-adk`에 풀었으므로 다음 파일이 이미 있어야 합니다.

```text
naia-adk\tools\discord-claude\worker.mjs
naia-adk\tools\discord-claude\README.md
naia-adk\tools\discord-claude\package.json
naia-adk\.agents\skills\monitor-discord\SKILL.md
```

`monitor-discord`는 Claude Code가 감시 프로그램을 설치하고 시작하는 순서를 담은 스킬입니다. `tools\discord-claude`는 실제로 Discord 메시지를 기다리는 프로그램입니다. 학생이 명령을 직접 실행하지 않고 Claude Code에게 맡깁니다.

## 4-5. Discord 정보를 data-private에 저장하기

PowerShell에서 `naia-adk`로 이동하고 Discord 전용 `.env`를 메모장으로 엽니다. 이 폴더는 학생용 ZIP에 포함되어 있으므로 별도로 만들 필요가 없습니다.

```powershell
cd $HOME\naia-adk
notepad data-private\discord-claude\.env
```

다음 세 줄을 붙여 넣습니다. `=` 오른쪽을 각자 복사한 값으로 바꾸고 저장합니다. 따옴표는 넣지 않습니다.

```text
DISCORD_BOT_TOKEN=Discord 봇 토큰
DISCORD_GUILD_ID=서버 숫자 ID
DISCORD_CHANNEL_ID=채널 숫자 ID
```

Discord 작업기는 시작할 때 이 파일을 직접 읽습니다. PowerShell에 환경변수로 불러오는 명령은 필요하지 않습니다. `.env`는 `data-private`에만 두고 GitHub나 Discord에 올리지 않습니다.

## 4-6. Claude Code에게 Discord 감시 맡기기

```powershell
cd $HOME\naia-adk
claude
```

```text
.agents/skills/monitor-discord/SKILL.md를 읽고 그 절차를 따라줘.
내 Discord 채널을 계속 감시하도록 시작해줘.
비밀값은 출력하지 말고 ready as와 watching을 확인하면 알려줘.
```

Claude Code가 필요한 패키지를 설치하고 감시 프로그램을 시작합니다. `ready as`와 `watching`을 확인했다는 답을 받으면 Claude Code 창을 그대로 열어 둡니다. Discord에 새 메시지가 올 때만 작업이 시작되며, 메시지가 없을 때는 AI를 반복 호출하지 않습니다.

## 4-7. 인사와 응답 확인

지정한 Discord 채널에서 보냅니다.

```text
안녕. 연결 상태만 한 문장으로 알려줘.
```

봇이 요청 접수와 응답을 보내면 성공입니다. 다른 채널의 메시지와 봇이 보낸 메시지에는 반응하지 않습니다.

> 화면 캡처 위치: 개인 서버에서 자연어 인사와 봇 응답이 함께 보이는 화면

## 완료 확인

* [ ] 내 개인 실습 서버를 만들었다.
* [ ] 학생 봇을 수업 서버가 아닌 개인 서버에 초대했다.
* [ ] `Message Content Intent`가 켜져 있다.
* [ ] Claude Code가 `ready as`와 `watching`을 확인했다.
* [ ] 자연어 인사에 응답한다.
* [ ] Discord 비밀값은 `data-private\discord-claude\.env`에만 저장했고 GitHub나 Discord에는 올리지 않았다.
