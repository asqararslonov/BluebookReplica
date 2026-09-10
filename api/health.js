import { json, cors } from './_lib/http.js'
import { usingRedis } from './_lib/store.js'
import { BOT_TOKEN, MENTOR_IDS, WEBHOOK_SECRET } from './_lib/telegram.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  json(res, 200, { ok: true, telegram: !!BOT_TOKEN, redis: usingRedis, mentors: MENTOR_IDS.length, webhookSecret: !!WEBHOOK_SECRET, time: Date.now() })
}
