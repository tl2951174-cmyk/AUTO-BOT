const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')

const contactsFile = './contacts.json'
if (!fs.existsSync(contactsFile)) fs.writeFileSync(contactsFile, JSON.stringify([]))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ["AUTO-BOT", "Chrome", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ AUTO-BOT Connected! Auto Status & Auto Save ON!')
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0]
      if (!msg.message) return
      const from = msg.key.remoteJid

      if (from === 'status@broadcast') {
        await sock.readMessages([msg.key])
        console.log('✅ Status Seen: ' + msg.pushName)
        return
      }

      if (from.endsWith('@s.whatsapp.net')) {
        let saved = JSON.parse(fs.readFileSync(contactsFile))
        if (!saved.includes(from)) {
          saved.push(from)
          fs.writeFileSync(contactsFile, JSON.stringify(saved, null, 2))
          console.log('✅ New Contact Saved: ' + from)
        }
      }
    } catch (e) { console.log(e) }
  })
}
startBot()
