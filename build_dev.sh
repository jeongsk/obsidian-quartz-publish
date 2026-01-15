#!/bin/zsh

set -e  # 오류 발생 시 스크립트 중단

npm i & npm run build

PLUGIN_NAME="quartz-publish"
PLUGIN_PATH="${OBSIDIAN_VAULT_PATH}/.obsidian/plugins/${PLUGIN_NAME}"

# 플러그인 디렉토리가 없으면 생성
if [[ ! -d "$PLUGIN_PATH" ]]; then
    echo "Creating plugin directory: $PLUGIN_PATH"
    mkdir -p "$PLUGIN_PATH"
fi

# 필수 파일 복사
echo "Copying plugin files to $PLUGIN_PATH..."
cp main.js "$PLUGIN_PATH/"
cp styles.css "$PLUGIN_PATH/"
cp manifest.json "$PLUGIN_PATH/"

echo "Done! Plugin files copied successfully."
