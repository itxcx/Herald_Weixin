Page({
  data: {
    url: '',
    title: '',
    markdown: {},
    markdownText: ''
  },
  onLoad(options) {
    this.loadUrl(unescape(options.url))
  },
  loadUrl(url) {
    var that = this
    this.data.url = url

    if (/\[uuid]/.test(url) && !wx.$.util('user').isLogin()) {
      wx.$.ask('需要登录', '请先登录再使用本功能', () => wx.reLaunch({ url: '/pages/index/index' }))
      return
    }

    wx.$.showLoading('加载中')
    let parsedUrl = url.replace(/\[uuid]/g, wx.$.util('user').getUuid())

    if (/\.md$/.test(parsedUrl)) { // markdown 直接加载
      wx.request({
        url: parsedUrl,
        success(res) {
          wx.$.hideLoading()
          if (res.statusCode < 400) {
            that.loadMarkdown(res.data)
          } else {
            that.loadMarkdown('# ' + res.statusCode + '\n\n页面不存在或暂无法打开')
          }
        },
        fail(res) {
          wx.$.hideLoading()
          that.loadMarkdown('# 访问页面失败\n\n错误信息：' + res.errMsg)
        }
      })
    } else { // 服务器转换加载
      wx.request({
        url: 'http://localhost:8080/wxapp/tomd',
        method: 'POST',
        data: parsedUrl,
        success(res) {
          wx.$.hideLoading()
          if (res.statusCode < 400) {
            that.loadMarkdown(res.data)
          } else {
            that.loadMarkdown('# ' + res.statusCode + '\n\n页面不存在或暂无法打开')
          }
        },
        fail(res) {
          wx.$.hideLoading()
          that.loadMarkdown('# 访问页面失败\n\n错误信息：' + res.errMsg)
        }
      })
    }
  },
  loadMarkdown(data) {
    this.setData({ markdownText: data })
    if (/(^|\n)#\s(.*)(\n|$)/.test(data)) {
      let title = RegExp.$2
      this.setData({ title: title })
      // 当前页面没退出时才设置标题，防止用户在加载过程中返回导致设置了别人的标题
      if (getCurrentPages().slice(-1)[0] == this) {
        wx.setNavigationBarTitle({ title: title })
      }
    }
    wx.$.util('wemark/wemark').parse(data, this, { name: 'markdown' })
  },
  onPullDownRefresh() {
    this.loadUrl(this.data.url)
    wx.stopPullDownRefresh()
  },
  parseLink(event) {
    var url = event.currentTarget.dataset.url
    if (/^\//.test(url)) {
      if (/^(([^\/]|\/\/)+)/.test(this.data.url)) {
        url = RegExp.$1 + url
      }
    }
    let ev = { currentTarget: { dataset: { url: url } } }
    this.open(ev)
  },
  onShareAppMessage() {
    var that = this
    return {
      title: that.data.title,
      path: '/pages/markdown/markdown?url=' + escape(that.data.url)
    }
  }
})