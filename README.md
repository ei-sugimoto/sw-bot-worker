# SwitchBot CO2 Monitor Worker

Cloudflare Workerを使用して、SwitchBot CO2センサー（MeterPro CO2）のデータを定期取得し、閾値超過時にLINE通知を送信するアプリケーション。

## 機能

- 毎分SwitchBot APIからCO2センサーのデータを取得
- CO2濃度、温度、湿度をログに記録
- CO2センサーのデバイスIDを自動検出
- **CO2濃度が2000ppm以上になるとLINE Messaging APIで通知**
- 値が閾値以下に戻るまで再通知を防止（KVで状態管理）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. SwitchBot APIトークンの取得

SwitchBotアプリから開発者トークンを取得します：

1. **SwitchBotアプリ**を開く
2. **プロフィール**タブ → **設定**（歯車アイコン）
3. **アプリバージョン**を**10回タップ**
4. **開発者向けオプション**が表示される
5. タップすると**Token**と**Secret**が表示される

### 3. LINE Messaging APIの設定

#### 3-1. LINE Developersでチャンネル作成

1. https://developers.line.biz/ にアクセス
2. LINEアカウントでログイン
3. **プロバイダー**を作成（または既存のものを選択）
4. **新規チャンネル作成** → **Messaging API**を選択
5. チャンネル情報を入力して作成

#### 3-2. Channel Access Tokenの取得

1. 作成したチャンネルの**Messaging API設定**タブを開く
2. **チャンネルアクセストークン（長期）**の**発行**をクリック
3. 表示されたトークンをコピー

#### 3-3. User IDの取得

通知を受け取るユーザーのIDを取得します：

**方法1: 自分のUser ID（BOTと1:1で通知を受け取る場合）**
1. チャンネルの**チャンネル基本設定**タブを開く
2. **あなたのユーザーID**をコピー

**方法2: Webhookで取得（他のユーザーに通知する場合）**
1. BOTを友だち追加してもらう
2. Webhookでメッセージを受信し、`source.userId`を取得

### 4. シークレットの設定

```bash
# SwitchBot トークンを設定
npx wrangler secret put SWITCHBOT_TOKEN

# SwitchBot シークレットを設定
npx wrangler secret put SWITCHBOT_SECRET

# LINE Channel Access Tokenを設定
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN

# LINE User IDを設定
npx wrangler secret put LINE_USER_ID
```

設定の確認：

```bash
npx wrangler secret list
```

### 5. ローカル開発用の設定（オプション）

ローカルで開発する場合は、プロジェクトルートに`.dev.vars`ファイルを作成：

```
SWITCHBOT_TOKEN=your_switchbot_token
SWITCHBOT_SECRET=your_switchbot_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_USER_ID=your_line_user_id
```

> **注意**: `.dev.vars`は`.gitignore`に追加してください

## 開発

### ローカルサーバーの起動

```bash
npm run dev
```

### スケジュール実行のテスト

開発サーバー起動中に、別ターミナルで：

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## デプロイ

```bash
npm run deploy
```

## ログの確認

### リアルタイムログ（wrangler tail）

```bash
npx wrangler tail
```

出力例：
```
[* * * * *] CO2: 450 ppm, Temp: 23.5°C, Humidity: 55%
[* * * * *] CO2: 2100 ppm, Temp: 24.0°C, Humidity: 60%
[* * * * *] CO2 threshold exceeded. Sending LINE notification...
[* * * * *] LINE notification sent successfully.
```

終了は `Ctrl+C`

### Cloudflareダッシュボード

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** → **sw-bot-worker**
3. **Logs** タブ → **Begin log stream**

## 通知の仕組み

```
毎分実行
    |
    v
CO2データ取得
    |
    v
CO2 >= 2000ppm?
  |
  +-- YES & 未通知 --> LINE通知送信 --> KVに状態保存
  |
  +-- YES & 通知済 --> スキップ（再通知防止）
  |
  +-- NO  & 通知済 --> KV状態クリア（次回超過時に通知可能）
```

## KV状態の確認・操作

```bash
# アラート状態の確認
npx wrangler kv key get --namespace-id=d1eda1ffd65b4c3985ace0ec4167d70e co2_alert_active

# アラート状態のクリア（手動リセット）
npx wrangler kv key delete --namespace-id=d1eda1ffd65b4c3985ace0ec4167d70e co2_alert_active
```

## スケジュール設定

デフォルトでは毎分実行されます。変更する場合は`wrangler.jsonc`を編集：

```jsonc
"triggers": {
    "crons": [
        "*/5 * * * *"  // 5分ごと
    ]
}
```

cron式の例：
| 式 | 説明 |
|---|---|
| `* * * * *` | 毎分 |
| `*/5 * * * *` | 5分ごと |
| `0 * * * *` | 毎時0分 |
| `0 */6 * * *` | 6時間ごと |

## 閾値の変更

`src/index.ts`の`CO2_THRESHOLD`定数を変更：

```typescript
const CO2_THRESHOLD = 2000;  // ppm
```

## API参照

- [SwitchBot API](https://github.com/OpenWonderLabs/SwitchBotAPI)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)

## ライセンス

MIT
