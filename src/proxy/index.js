/**
 * 代理模块
 * 将从接口获取到的代理写入文件，读取代理直接从文件中读取
 */

const { PROXY: { proxy, interval, timeout }, REDIS } = require('../config')
const { proxyXiCi, proxyFreeList } = require('../data/config')
const crawl = require('../crawl')
const { _debug, _filter: { isInvalidUrl } } = require('../utils')
const superagent = require('superagent')
require('superagent-proxy')(superagent)
const async = require('async')

/**
 * 代理写入函数
 */
const writeProxies = async () => {
  // 初始化写入数据
  let proxies = []
  let flag = true

  // 存在proxyFreeList相关配置
  if (proxyFreeList) {
    const list = await crawl(proxyFreeList)
    if (list.state) {
      proxies = proxies.concat(list.data)
      flag = false
    } else {
      _debug(`ProxyFreeList代理获取失败,失败详情:${list.data}`, true)
    }
  }

  // 如果存在西刺代理的配置，则抓取西刺代理.
  if (proxyXiCi && flag) {
    const xici = await crawl(proxyXiCi)
    if (xici.state) {
      proxies = proxies.concat(xici.data)
    } else {
      _debug(`西刺代理获取失败,失败详情:${xici.data}`)
    }
  }

  // 检测可用代理
  proxies = await new Promise(function (resolve, reject) {
    async.mapLimit(proxies, 100, (proxy, fn) => {
      const _proxy = `http://${proxy.ip}:${proxy.port}`
      superagent.get('http://ip-api.com/json').timeout(timeout).proxy(_proxy).buffer(true).end((err, res) => {
        if (err) {
          fn(null, '')
        } else {
          if (res.body['status'] === 'success') {
            fn(null, _proxy)
          } else {
            fn(null, '')
          }
        }
      })
    }, (err, res) => {
      if (err) {
        _debug(`代理检测出错，错误详情${err}`)
      }
      resolve([...new Set(res)].filter(n => n !== '' || !isInvalidUrl(n)))
    })
  })

  // 整合直接写在配置文件中的代理
  proxies = proxies.concat(proxy)

  try {
    await REDIS.setAsync('proxy', JSON.stringify(proxies))
    REDIS.expire('proxy', interval)
  } catch (e) {
    _debug(`Redis配置代理失败,${e}`)
  }
}

/**
 * 读取代理函数
 */
const readProxies = async () => {
  try {
    let result = JSON.parse(await REDIS.getAsync('proxy'))

    // 如果获取到了，说明没过期
    if (result) {
      return Promise.resolve(result)
    } else {
      await writeProxies()
      return Promise.resolve(JSON.parse(await REDIS.getAsync('proxy')))
    }
  } catch (e) {
    _debug(`Redis读取代理失败,${e}`)
  }
  return Promise.resolve([])
}

module.exports = readProxies
