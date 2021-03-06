// Wx.js 配置项
const config = {
  urlFormatter: route => 'https://www.heraldstudio.com/' + route,
  pageFormatter: pageName => '/pages/' + pageName.split('?')[0] + '/' + pageName,
  stopPoints: []
}

// 注入对象：把 injector 中的成员注入到 injectee
// 若 replace == true，有冲突时，优先保留新注入的 injector 成员，原来 injectee 的成员名前加 super_ 作为备选
// 若 replace == false，有冲突时，优先保留原有的 injectee 成员，新注入的成员名前加 super_ 作为备选
function injectObject (injector, injectee, replace = false, recursive = true) {
  for (let key in injector) {
    if (injector.hasOwnProperty(key)) {
      // 若已存在原版成员，根据 replace 进行相应处理
      try {
        if (injectee.hasOwnProperty(key)) {
          if (recursive && typeof(injectee[key]) === 'object') {
            injectObject(injector[key], injectee[key], replace, true)
          } else if (replace) {
            injectee['super_' + key] = injectee[key]
            injectee[key] = injector[key]
          } else {
            injectee['super_' + key] = injector[key]
          }
        } else {
          // 注入新版成员
          injectee[key] = injector[key]
        }
      } catch (err) {
        console.error('Wx.js Inject Fail:', key);
      }
    }
  }
}

// Wx.js 核心注入
function beginInject () {
  // 注入 wx 成员
  wx.$ = {}
  // 注入 wx.$.util
  wx.$.util = js => require(js + '.js')
  injectObject(module.exports, wx.$, true)
  // 注入 Page
  wx.$.super_Page = Page
  Page = _Page
  // 测试注入结果
  Page()
}

// Wx.js Page() 方法注入兼注入情况测试
function _Page (obj) {
  if (obj) {
    let pageProto = wx.$.util('page')
    injectObject(pageProto, obj, false)

    wx.$.super_Page(obj)
  } else { // obj 为空时展示注入情况
    wx.$.log('Wx.js', 'Inject Success', 'Using Domain:', config.urlFormatter('[route]'))
  }
}

// Pretty Log
function log (title, ...args) {
  console.log(
    '%c' + title,
    "display: block; color: #ffffff; background: #1cadcf; border-radius: 2px; padding:2px 5px; line-height: 20px",
    ...args
  )
}

// Pretty Log
function error (title, ...args) {
  console.error(
    '%c' + title,
    "display: block; color: #ffffff; background: #1cadcf; border-radius: 2px; padding:2px 5px; line-height: 20px",
    ...args
  )
}

/*
  根据传入的操作列表，筛选出可执行的操作进行展示
  @param actions: [
    {
      name: '操作名称',
      condition: 操作可执行的条件,
      action: 执行该操作的回调函数
    }, ...
  ]
*/
function showActions (actions) {
  actions = actions.filter(k => k.condition !== false)
  if (actions.length) {
    wx.showActionSheet({
      itemList: actions.map(k => k.name),
      success: function (data) {
        if (typeof data.tapIndex === "number") {
          actions[data.tapIndex].action && actions[data.tapIndex].action()
        }
      }
    })
  } else {
    wx.showActionSheet({
      itemList: ['暂无相关操作'],
      itemColor: '#666'
    })
  }
}

function ask (title, message, callback) {
  wx.showModal({
    title: title,
    content: message,
    success: function (res) {
      if (res.confirm) {
        callback && callback()
      }
    }
  })
}

function requestApi (obj) {
  obj = obj || {}
  obj.data = obj.data || {}
  obj.data.uuid = obj.data.uuid || wx.$.util('user').getUser().uuid || '0000000000000000000000000000000000000000'
  obj.method = obj.method || 'POST'
  requestSimple(obj)
}

let requestCount = 0

function requestSimple (obj) {
  obj.header = obj.header || {}
  obj.header['Content-Type'] = 'application/x-www-form-urlencoded'

  function beginRequest () {
    if (requestCount >= 5) {
      setTimeout(beginRequest, 500)
      return
    }
    requestCount += 1
    wx.request({
      url: obj.route ? config.urlFormatter(obj.route) : obj.url,
      data: obj.data,
      header: obj.header,
      method: obj.method || 'GET',
      success: obj.success,
      fail: obj.fail,
      complete: function (res) {
        if (res.statusCode < 400) {
          wx.$.log(
            res.statusCode || 0, (obj.method || 'GET') + ' ' + (obj.route ? config.urlFormatter(obj.route) : obj.url),
            'Data:', obj.data || 'none',
            'Result: ', res
          )
        } else {
          wx.$.error(
            res.statusCode || 0, (obj.method || 'GET') + ' ' + (obj.route ? config.urlFormatter(obj.route) : obj.url),
            'Data:', obj.data || 'none',
            'Response: ', res
          )
        }
        obj.complete && obj.complete(res)
        requestCount -= 1
      }
    })
  }

  beginRequest()
}

function userStorage (key, value) {
  if (value !== undefined) {
    wx.setStorageSync(wx.$.util('user').getUuid() + '-' + key, value)
  } else {
    return wx.getStorageSync(wx.$.util('user').getUuid() + '-' + key)
  }
}

function comp (str) {
  return require('../components/' + str + '/' + str + '.js')
}

function showSuccess (str, callback) {
  wx.showToast({ icon: 'success', title: str, success: callback })
}

function showLoading (str) {
  wx.showToast({ icon: 'loading', title: str, duration: 10000 })
  wx.showNavigationBarLoading()
}

function hideLoading () {
  wx.hideToast()
  wx.hideNavigationBarLoading()
}

function showError (str, callback) {
  wx.showModal({ title: '提示', content: str, showCancel: false, success: callback })
}

module.exports = {
  config, beginInject, Page, log, error,
  ask, requestApi, requestSimple, userStorage, comp,
  showActions, showSuccess, showLoading, hideLoading, showError
}
