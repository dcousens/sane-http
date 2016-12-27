var parsers = require('./parsers')
var url = require('url')
var CONTENT_TYPE_MAP = {
  'object': 'application/json',
  'string': 'text/plain'
}

var PROTOCOLS = {
  'http:': require('http'),
  'https:': require('https')
}

module.exports = function (options, callback) {
  var timeout
  function done (err, res) {
    if (timeout) clearTimeout(timeout)
    if (callback) callback(err, res)
    callback = undefined
  }

  // don't mutate
  options = Object.assign({}, options)

  if (options.url) {
    Object.assign(options, url.parse(options.url))
  }

  if (options.body !== undefined) {
    var typeOf = typeof options.body

    options.headers = options.headers || {}
    if (!options.headers['content-type']) {
      // don't mutate
      options.headers = Object.assign({}, options.headers)
      options.headers['content-type'] = CONTENT_TYPE_MAP[typeOf]
    }

    if (typeOf !== 'string') {
      options.body = JSON.stringify(options.body)
    }
  }

  var protocol
  if (options.protocol !== undefined) {
    protocol = PROTOCOLS[options.protocol]
  }

  var request = protocol.request(options, function (response) {
    var length = response.headers['content-length']
    if (options.limit && length > options.limit) return done(new Error('Content-Length exceeded limit'))

    function handle (err, body) {
      if (err) return done(err)

      var result = {
        statusCode: response.statusCode,
        headers: response.headers,
        body: body
      }

      done(null, result)
    }

    var contentType = response.headers['content-type']
    if (contentType) {
      if (options.json || /application\/json/.test(contentType)) return parsers.json(response, length, handle)
      if (options.text || /text\/(plain|html)/.test(contentType)) return parsers.text(response, length, handle)
      if (options.raw || /application\/octet-stream/.test(contentType)) return parsers.raw(response, length, handle)
    }

    handle()
  })

  request.on('error', done)

  if (options.timeout) {
    timeout = setTimeout(function () {
      request.abort()

      done(new Error('ETIMEDOUT'))
    }, options.timeout)
  }

  request.end(options.body)
}
