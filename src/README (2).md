# 🌐 Global Chat Bot

複数のDiscordサーバー間でメッセージをリアルタイム転送するBotです。  
Webhookを使って送信者の名前・アイコンを再現します。

## セットアップ

### 1. Botの作成（Discord Developer Portal）

1. https://discord.com/developers/applications でアプリを作成
2. **Bot** タブ → Token をコピー
3. **OAuth2 → URL Generator** で以下のスコープと権限を付与してURLを生成:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Manage Webhooks`, `Read Message History`, `View Channels`

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:

```
DISCORD_TOKEN=ここにBotのトークン
CLIENT_ID=ここにApplicationのID（Developer Portal > General Information）
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. スラッシュコマンドの登録

```bash
npm run deploy
```

### 5. Bot の起動

```bash
npm start
```

---

## コマンド一覧

| コマンド | 説明 | 必要権限 |
|---|---|---|
| `/global-join` | このチャンネルをグローバルチャットに参加 | Manage Channels |
| `/global-leave` | このチャンネルをグローバルチャットから退出 | Manage Channels |
| `/global-list` | 参加中のサーバー一覧を表示 | 誰でも |
| `/global-ban add @user` | ユーザーをBANしメッセージ転送を停止 | Ban Members |
| `/global-ban remove @user` | BAN解除 | Ban Members |
| `/global-ban list` | BANリスト表示 | Ban Members |

---

## ファイル構成

```
global-chat-bot/
├── src/
│   ├── index.js            # メインエントリ（Bot起動・メッセージ転送）
│   ├── registry.js         # チャンネル登録データの管理
│   ├── deploy-commands.js  # スラッシュコマンド登録スクリプト
│   └── commands/
│       ├── join.js         # /global-join
│       ├── leave.js        # /global-leave
│       ├── list.js         # /global-list
│       └── ban.js          # /global-ban
├── data/                   # 自動生成（チャンネル登録データ保存先）
│   ├── channels.json
│   └── banned.json
├── .env                    # 環境変数（gitignoreに追加すること）
├── .env.example
└── package.json
```

---

## 本番運用に向けて

- `data/channels.json` はファイルベースのため、SQLite（`better-sqlite3`）やRedisへの移行を推奨
- Webhookは各チャンネルに1つ作成されます（Discordの上限：チャンネルあたり15個）
- サーバー数が増えたらレート制限（Rate Limit）に注意

---

## .gitignore（推奨）

```
node_modules/
.env
data/
```
