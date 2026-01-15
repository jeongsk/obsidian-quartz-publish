
## 설정

- 설정에서 Github 토큰을 입력 받습니다. Github 토큰을 발급받는 방법에 대해 설명 또는 링크를 제공합니다.
- github repository 를 입력받습니다. -> quartz 배포 가능한 리포지토리인지 검사합니다.
	- 또는, 초보자를 위해서 github repository를 입력 받지 않고, https://github.com/jackyzha0/quartz 를 사용하여 자동으로 생성하는 것도 가능합니다. 
- 옵시디언 플러그인 설정에서 다음 설정이 가능해야합니다. -> 설정하고 반영(또는 저장)을 누르면 나의 quartz github repository에 반영되어야함.
	- Quartz 일부만 공개 기능: plugins 설정 부분에서 ExplicitPublish() 플러그인을 추가합니다. 또는 제거합니다.
	- Quartz  일부만 숨김 기능: Quartz는 기본적으로 이 설정이 되어 있습니다 (RemoveDrafts() 플러그인).
	- 특정 폴더 통째로 제외하기: quartz.config.ts 파일에서 ignorePatterns 부분에 제외하고 싶은 폴더나 파일명을 리스트에 추가합니다.
- 파일의 주소 규칙 변경: Quartz는 기본적으로 제공되는 URL 생성 규칙(Strategy)을 적용 할 수 있음. shortestPaths, absolutePaths
- https://github.com/jackyzha0/quartz 가 버전업 된 경우, 업그레이드 기능(최진 quartz 버전은 설정 화면 접속시 자동 체크)

## 발행

- https://github.com/oleeskild/obsidian-digital-garden 플러그인처럼 노트 관리가 가능합니다. 
	- 발행이 필요한 노트
	- 업데이트가 필요한 노트(재발행이 필요한 노트)
	- 삭제된 노트(삭제가 필요한 노트)
	- 기타 등등
