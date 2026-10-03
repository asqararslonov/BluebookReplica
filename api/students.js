import { json, cors } from './_lib/http.js'
import { activeStudents } from './_lib/store.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  try {
    const list = await activeStudents()
    json(res, 200, { ok: true, count: list.length, students: list })
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
