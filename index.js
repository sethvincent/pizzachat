#! /usr/bin/env node

var path = require('path')
var swarm = require('discovery-swarm')
var isBuffer = require('is-buffer')
var hyperlog = require('hyperlog')
var sub = require('subleveldown')
var hyperkv = require('hyperkv')
var tmp = require('os-tmpdir')
var level = require('level-party')
var uuid = require('uuid')

var db = level(path.join(tmp(), 'pizzachat'))
var log = hyperlog(sub(db, 'log'), { valueEncoding: 'json' })
var kv = hyperkv({ db: sub(db, 'kv'), log: log })

var username = process.argv[2]
var channel = process.argv[3]

if (!username) {
  console.log('username required as first option')
  usage()
  process.exit(1)
}

if (!channel) {
  console.log('channel required as second option')
  usage()
  process.exit(1)
}

function usage () {
  console.log(`
  USAGE:
  
  pizzachat {username} {channel}
  `)
}

var sw = swarm({
  dns: { server: ['104.236.141.88:4343'] },
  dht: true
})

sw.listen(0)
sw.join(channel)

log.on('add', function (node) {
  var value = isBuffer(node.value) ? JSON.parse(node.value.toString()).v : node.value.v
  if (username !== value.user) console.log(value.user + ':', value.msg)
})

process.stdin.on('data', function (data) {
  kv.put(uuid(), { msg: data.toString().trim(), user: username, channel: channel })
})

sw.on('connection', function (connection) {
  connection.pipe(log.replicate()).pipe(connection)
})
