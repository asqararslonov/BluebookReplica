// Telegram webhook: mentor messages come in here and are routed to students.
//   • Reply (Telegram "Reply") to a forwarded student message  -> goes to that student
//   • /to CODE message                                          -> goes to that student
//   • plain message                                             -> goes to every student active in the last 3 hours
//   • /students                                                 -> lists active students
import { json, readJson, clip } from './_lib/http.js'
import { appendMessage, activeStudents, lookupRoute } from './_lib/store.js'
import { tg, isMentor, WEBHOOK_SECRET, newId } from './_lib/telegram.js'

const HELP = 'Bluebook mentor bot.\n\nStudents’ questions arrive here tagged with a code like #A7K2QZ. Reply to a question to answer that student, or use /to A7K2QZ your answer. A message that is not a reply goes to every active student. /students lists who is online.'

async function deliver(code, text, mentorName) {
  await appendMessage(code, { id: newId(), ts: Date.now(), from: 'mentor', name: mentorName, text })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  if (WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) return json(res, 401, { error: 'Bad secret' })
  const update = await readJson(req)
  // Edited messages are ignored so an edit never re-delivers or re-broadcasts.
  const msg = update.message
  // Always answer 200 so Telegram doesn't retry.
  if (!msg || !msg.chat) return json(res, 200, { ok: true })
  const chatId = msg.chat.id
  const text = clip(msg.text, 2000)
  const mentorName = clip(msg.from?.first_name, 40) || 'Mentor'

  try {
    if (!isMentor(msg.from?.id ?? chatId)) {
      await tg('sendMessage', { chat_id: chatId, text: `This bot is for authorized mentors. Your chat id is ${chatId}; add it to MENTOR_CHAT_IDS to enable it.` })
      return json(res, 200, { ok: true })
    }
    if (!text) {
      await tg('sendMessage', { chat_id: chatId, text: 'Only text messages can be sent to students for now.' })
      return json(res, 200, { ok: true })
    }
    if (/^\/start|^\/help/.test(text)) {
      await tg('sendMessage', { chat_id: chatId, text: HELP })
      return json(res, 200, { ok: true })
    }
    if (/^\/students/.test(text)) {
      const list = await activeStudents()
      const lines = list.length ? list.map((s) => `#${s.code} ${s.name || 'Student'}${s.context ? ` · ${s.context}` : ''}`).join('\n') : 'No students are online right now.'
      await tg('sendMessage', { chat_id: chatId, text: lines })
      return json(res, 200, { ok: true })
    }
    if (/^\/to\b/.test(text)) {
      const direct = /^\/to\s+#?([A-Za-z0-9]{4,12})\s+([\s\S]+)/.exec(text)
      if (!direct) {
        await tg('sendMessage', { chat_id: chatId, text: 'Usage: /to CODE your answer — for example: /to A7K2QZ Start by isolating x.' })
        return json(res, 200, { ok: true })
      }
      const code = direct[1].toUpperCase()
      const known = (await activeStudents()).some((s) => s.code === code)
      if (!known) {
        await tg('sendMessage', { chat_id: chatId, text: `No active student has the code #${code}. Use /students to see who is online.` })
        return json(res, 200, { ok: true })
      }
      await deliver(code, direct[2].trim(), mentorName)
      await tg('sendMessage', { chat_id: chatId, text: `Sent to #${code}.` })
      return json(res, 200, { ok: true })
    }
    if (text.startsWith('/')) {
      await tg('sendMessage', { chat_id: chatId, text: `Unknown command. ${HELP}` })
      return json(res, 200, { ok: true })
    }
    if (msg.reply_to_message) {
      const routed = await lookupRoute(chatId, msg.reply_to_message.message_id)
      const tagged = /#([A-Z0-9]{4,12})/.exec(msg.reply_to_message.text || '')
      const code = routed || (tagged && tagged[1])
      if (!code) {
        await tg('sendMessage', { chat_id: chatId, text: "I couldn't tell which student that reply is for. Reply directly to a student's question, or use /to CODE your answer." })
        return json(res, 200, { ok: true })
      }
      await deliver(code, text, mentorName)
      await tg('sendMessage', { chat_id: chatId, text: `Sent to #${code}.` })
      return json(res, 200, { ok: true })
    }
    const students = await activeStudents()
    if (students.length === 0) {
      await tg('sendMessage', { chat_id: chatId, text: 'No students are online right now, so nothing was sent. Use /students to check later.' })
      return json(res, 200, { ok: true })
    }
    for (const s of students) await deliver(s.code, text, mentorName)
    await tg('sendMessage', { chat_id: chatId, text: `Sent to ${students.length} active student${students.length === 1 ? '' : 's'}. Reply to a specific question to answer one student only.` })
    return json(res, 200, { ok: true })
  } catch (err) {
    console.error('[telegram] webhook error', err)
    return json(res, 200, { ok: false, error: err.message })
  }
}
