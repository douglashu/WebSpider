const monk = require('monk')
const { DB: { url, connectOption } } = require('../config')
const _time = require('../utils/time')
const db = monk(url, connectOption)
const collection = db.get('statistics')

/**
 * API调用统计模型
 * @param {string} url 调用的API
 * @param {string} time API创建时间
 * @param {number} count API调用总次数
 */
class Statistics {
  constructor ({ sid, cid, url, time, count }) {
    this.sid = sid
    this.cid = cid
    this.url = url
    this.time = time.toString()
    this.count = count
  }
  save () {
    /**
     * 按年、月、日统计
     */
    const t = new Date()
    const year = t.getFullYear()
    const month = t.getMonth() + 1
    const day = t.getDate()

    const statistics = {
      sid: this.sid,
      cid: this.cid,
      url: this.url,
      time: this.time,
      count: this.count,
      history: [{
        year,
        data: [{
          month,
          data: [{
            day,
            // data的长度就是当天的该 API 调用次数
            data: [_time(t)]
          }]
        }]
      }]
    }
    return collection.insert(statistics)
      .then(docs => ({
        state: true,
        time: new Date().toLocaleString(),
        data: docs,
        msg: 'API调用统计初始化成功'
      }))
      .catch(err => ({
        state: false,
        time: new Date().toLocaleString(),
        data: err,
        msg: 'API调用统计初始化失败'
      }))
  }
  static get (findFlag, option) {
    return collection.find(findFlag, option)
      .then(docs => ({
        state: docs.length > 0,
        time: new Date().toLocaleString(),
        data: docs,
        msg: docs.length > 0 ? '获取成功' : '无数据或获取失败'
      }))
      .catch(err => ({
        state: false,
        time: new Date().toLocaleString(),
        data: err,
        msg: '获取失败'
      }))
  }

  static update (findFlag, newValue) {
    return collection.update(findFlag, { $set: newValue })
      .then(docs => ({
        state: docs.n === 1 && docs.nModified === 1 && docs.ok === 1,
        time: new Date().toLocaleString(),
        data: docs,
        msg: docs.n === 1 && docs.nModified === 1 && docs.ok === 1 ? 'API调用统计信息更新成功' : 'API调用统计信息更新失败'
      }))
      .catch((err) => ({
        state: false,
        time: new Date().toLocaleString(),
        data: err,
        msg: 'API调用统计信息更新失败'
      }))
  }

  static delete (findFlag) {
    return collection.remove(findFlag)
      .then(
        () => {
          return collection.find(findFlag).then(docs => ({
            state: docs.length === 0,
            time: new Date().toLocaleString(),
            data: docs.length > 0 ? 'API调用统计信息删除失败' : 'API调用统计信息删除成功',
            msg: docs.length > 0 ? 'API调用统计信息删除失败' : 'API调用统计信息删除成功'
          })).catch(err => err)
        }
      )
      .catch(err => ({
        state: false,
        time: new Date().toLocaleString(),
        data: err,
        msg: 'API调用统计信息删除失败'
      }))
  }
}

module.exports = Statistics
