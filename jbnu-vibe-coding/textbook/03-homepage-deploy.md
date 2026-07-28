# 3. Claude Code를 이용한 홈페이지 배포 \[15분]

## 목표

가상 회사 자료를 근거로 Tailwind CSS 원페이지를 만들고, 로컬에서 확인한 뒤 수동으로 GitHub Pages에 배포합니다. 이후 GitHub CLI를 설치해 수정과 재배포를 Claude Code에게 맡깁니다.

## 3-1. 홈페이지 저장소 내려받기

HTTPS 주소는 GitHub에 있는 내 저장소를 Git이 찾아가기 위한 인터넷 주소입니다. 보통 `https://github.com/아이디/아이디.github.io.git`처럼 생겼습니다.

1. GitHub에서 1장에 만든 `<내 GitHub 아이디>.github.io` 저장소를 엽니다.
2. 초록색 `Code` 버튼을 누릅니다.
3. `HTTPS` 탭을 선택하고 주소 오른쪽의 복사 버튼을 누릅니다.
4. PowerShell에서 `notepad`를 입력해 메모장을 엽니다.
5. 아래 세 줄을 메모장에 붙여 넣습니다.
6. `여기에_복사한_HTTPS_주소`만 지우고 GitHub에서 복사한 주소를 붙여 넣습니다.
7. 완성된 세 줄을 모두 복사해 PowerShell에 `Ctrl+Shift+V`로 붙여 넣습니다.

```powershell
cd $HOME\naia-adk\projects
git clone 여기에_복사한_HTTPS_주소 website
cd $HOME\naia-adk
```

`website`는 `naia-adk\projects` 안에 만들어질 폴더 이름입니다. GitHub 저장소 이름을 바꾸는 것이 아닙니다. 마지막 줄에서 `naia-adk` 작업공간으로 돌아옵니다.

> 화면 캡처 위치: GitHub 저장소의 `Code → HTTPS` 주소와 복사 버튼이 보이는 화면

## 3-2. Claude Code에 홈페이지 제작 요청

먼저 파일 탐색기에서 `naia-adk\data-company\workshop\assets` 폴더를 홈페이지 저장소 안으로 복사합니다. 홈페이지 저장소에 `assets` 폴더와 PNG 네 장이 보이면 됩니다.

```powershell
cd $HOME\naia-adk
claude
```

Claude Code는 `naia-adk` 작업공간의 회사 자료와 작업 규칙을 함께 읽을 수 있도록 항상 `naia-adk` 폴더에서 실행합니다. 홈페이지를 만들 위치는 앞에서 복제한 `./projects/website`로 요청문에 정확히 지정합니다.

다음 요청을 그대로 붙여 넣습니다. Claude Code에 여러 줄을 붙여 넣으면 내용 전체 대신 `[Pasted text #1 +8 lines]`처럼 붙여 넣은 글의 줄 수가 표시될 수 있습니다. 내용이 사라진 것이 아니라 화면에서 접혀 보이는 정상 동작이므로 그대로 Enter를 누르면 됩니다.

```text
./data-company/workshop/company.md와 ./data-company/workshop/company-design.md만 읽어.
./projects/website/assets에 PNG 네 장은 이미 복사되어 있어.
지금 ./projects/website/index.html 한 파일만 작성해.
Tailwind CSS CDN을 사용하는 원페이지로 만들고
소개, 고객 문제, 해결 방법, 핵심 기능, 활동, 문의 섹션을 넣어.
기존 PNG 상대경로를 사용하고 SVG, 프레임워크, 설치, git 작업은 하지 마.
자료에 없는 수치나 연락처를 만들지 마.
다 만들면 로컬 확인용 서버를 띄우고 브라우저도 열어줘.
```

요청문에는 다섯 가지가 있습니다: 목적, 참고 자료, 결과물, 하지 말아야 할 것, 완료 확인. 무료 모델이나 작은 모델일수록 이 조건을 구체적으로 써야 빈 프로젝트만 만들고 끝나는 일을 줄일 수 있습니다.

## 3-3. 로컬에서 확인

Claude Code를 종료하지 않습니다. 제작이 끝나면 Claude Code가 로컬 확인용 서버를 띄우고 브라우저를 엽니다. 브라우저가 자동으로 열리지 않으면 Claude Code가 알려 준 `http://localhost:...` 주소를 복사해 브라우저 주소창에 붙여 넣습니다.

Claude Code가 아직 서버를 띄우지 않았다면 같은 대화에 다음 한 문장만 입력합니다.

```text
완성된 홈페이지를 확인할 수 있게 로컬 서버를 띄우고 브라우저도 열어줘.
```

브라우저에 홈페이지가 보이면 서버가 실행된 것입니다. 확인이 끝나면 Claude Code에 `로컬 서버를 종료해줘`라고 입력합니다. 같은 Claude Code 세션은 계속 사용합니다.

`localhost`는 인터넷에 공개된 주소가 아니라 내 노트북에서만 보는 임시 주소입니다. GitHub Pages 주소는 뒤에서 `push`한 뒤 생기는 공개 주소입니다.

> 화면 캡처 위치: 주소창의 `http://localhost:8000`과 완성된 원페이지가 함께 보이는 화면

브라우저에서 다음을 확인합니다.

* 회사명과 제품명이 회사 자료와 같은가
* 제공된 PNG 이미지가 깨지지 않는가
* 없는 실적이나 연락처를 만들지 않았는가
* 창 너비를 줄여도 글과 이미지가 겹치지 않는가

## 3-4. 처음 배포는 직접 하기

Claude Code는 그대로 열어 둡니다. 새 PowerShell 창을 하나 더 열고 다음 명령을 실행합니다. 첫 줄에서 홈페이지를 만든 GitHub Pages 저장소로 이동합니다.

```powershell
cd $HOME\naia-adk\projects\website
git status
git add index.html assets
git commit -m "회사 첫 홈페이지 작성"
git push origin main
```

GitHub 저장소의 `Settings → Pages`에서 `Deploy from a branch`, `main`, `/(root)`를 선택합니다. 잠시 뒤 `https://<내 GitHub 아이디>.github.io`를 엽니다. 변경이 바로 안 보이면 1\~2분 뒤 새로 고칩니다.

## 3-5. GitHub CLI 설치

```powershell
winget install --id GitHub.cli -e --source winget
gh --version
gh auth login
```

`gh`는 GitHub의 저장소, 로그인, 작업 상태를 터미널에서 다루는 도구입니다. 브라우저 로그인을 선택하고 안내에 따라 인증합니다. Git이 변경 이력을 다룬다면, `gh`는 GitHub 서비스 기능을 다룹니다.

## 3-6. 수정과 재배포는 Claude Code에 맡기기

이 단계에서 Claude Code가 GitHub에 배포할 수 있는 이유는 3-5에서 GitHub CLI(`gh`)를 설치하고 로그인했기 때문입니다. `gh`가 설치되어 있지 않았다면 Claude Code가 배포를 시도하는 과정에서 먼저 설치와 로그인이 필요하다고 안내했을 것입니다. 이 교재에서는 수업 흐름을 일정하게 맞추기 위해 3-5에서 사람이 먼저 설치합니다.

3-2에서 `naia-adk` 폴더로 실행해 둔 Claude Code 창으로 돌아가 다음 요청을 입력합니다.

```text
./projects/website/index.html에서 첫 화면의 "소상공인 홈페이지"를 "소상공인 원페이지 홈페이지"로 한 번만 수정해줘.
다른 문구와 디자인은 바꾸지 마.
./projects/website 저장소에서 수정 위치와 git diff를 확인한 뒤 commit하고 main에 push해.
마지막에 gh로 Pages 배포 상태와 공개 주소를 알려줘.
```

AI가 완료했다고 말해도 공개 주소를 사람이 직접 열어 바뀐 문구를 확인해야 합니다.

> 화면 캡처 위치: GitHub Pages 공개 주소와 수정된 문구가 함께 보이는 화면

## 완료 확인

* [ ] 로컬에서 `index.html`이 열린다.
* [ ] 제공된 PNG 이미지만 사용했다.
* [ ] 첫 commit과 push를 직접 수행했다.
* [ ] GitHub Pages 공개 주소가 열린다.
* [ ] 두 번째 수정은 Claude Code가 commit·push했다.
* [ ] 공개 화면에서 수정 내용이 보인다.
