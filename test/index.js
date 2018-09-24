const dhttp = require('../')
const express = require('express')
const tape = require('tape')

const app = express()
const http = require('http')

app.get('/text', function (req, res) {
  res.status(200).send('foobar')
})

app.get('/json', function (req, res) {
  res.status(200).send({ 'foo': 'bar' })
})

app.get('/buffer', function (req, res) {
  res.status(200).send(Buffer.alloc(10, 15))
})

app.post('/echo', require('body-parser').json(), function (req, res) {
  res.status(200).send(req.body)
})

const server = http.createServer(app)
server.listen(8080)

const vectors = [
  { path: '/text', value: 'foobar' },
  { path: '/json', value: { 'foo': 'bar' } },
  { path: '/buffer', value: Buffer.alloc(10, 15) },
  { path: '/echo', method: 'POST', body: { foo: 1 }, value: { foo: 1 } },
  { path: '/echo', method: 'POST', body: [ 1 ], value: [ 1 ] }
]

tape('dhttp', function (t) {
  t.plan(3 * vectors.length + 2)

  vectors.forEach((v) => {
    dhttp({
      method: v.method || 'GET',
      url: 'http://localhost:8080' + v.path,
      body: v.body
    }, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.deepEqual(res.body, v.value)
    })
  })

  dhttp({
    method: 'GET',
    url: 'http://localhost:8080/missing'
  }, function (err, res) {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

tape.onFinish(function () {
  server.close()
})
