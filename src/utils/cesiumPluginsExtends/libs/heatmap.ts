

const h337: any = function () {
  var a: any = {
    defaultRadius: 40,
    defaultRenderer: 'canvas2d',
    defaultGradient: {
      0.25: 'rgb(0,0,255)',
      0.55: 'rgb(0,255,0)',
      0.85: 'yellow',
      1: 'rgb(255,0,0)'
    },
    defaultMaxOpacity: 1,
    defaultMinOpacity: 0,
    defaultBlur: 0.85,
    defaultXField: 'x',
    defaultYField: 'y',
    defaultValueField: 'value',
    plugins: {}
  }
  var b: any = (function h() {
    var b: any = function d(this: any, a: any) {
      this._coordinator = {}
      this._data = []
      this._radi = []
      this._min = 0
      this._max = 1
      this._xField = a['xField'] || a.defaultXField
      this._yField = a['yField'] || a.defaultYField
      this._valueField = a['valueField'] || a.defaultValueField
      if (a['radius']) {
        this._cfgRadius = a['radius']
      }
    }
    var c: any = a.defaultRadius
    b.prototype = {
      _organiseData: function (this: any, a: any, b: any) {
        var d: any = a[this._xField]
        var e: any = a[this._yField]
        var f: any = this._radi
        var g: any = this._data
        var h: any = this._max
        var i: any = this._min
        var j: any = a[this._valueField] || 1
        var k: any = a.radius || this._cfgRadius || c
        if (!g[d]) {
          g[d] = []
          f[d] = []
        }
        if (!g[d][e]) {
          g[d][e] = j
          f[d][e] = k
        } else {
          g[d][e] += j
        }
        if (g[d][e] > h) {
          if (!b) {
            this._max = g[d][e]
          } else {
            this.setDataMax(g[d][e])
          }
          return false
        } else {
          return { x: d, y: e, value: j, radius: k, min: i, max: h }
        }
      },
      _unOrganizeData: function (this: any) {
        var a: any = []
        var b: any = this._data
        var c: any = this._radi
        for (var d in b) {
          for (var e in b[d]) {
            a.push({ x: d, y: e, radius: c[d][e], value: b[d][e] })
          }
        }
        return { min: this._min, max: this._max, data: a }
      },
      _onExtremaChange: function (this: any) {
        this._coordinator.emit('extremachange', {
          min: this._min,
          max: this._max
        })
      },
      addData: function (this: any) {
        if (arguments[0].length > 0) {
          var a: any = arguments[0]
          var b: any = a.length
          while (b--) {
            this.addData.call(this, a[b])
          }
        } else {
          var c: any = this._organiseData(arguments[0], true)
          if (c) {
            this._coordinator.emit('renderpartial', {
              min: this._min,
              max: this._max,
              data: [c]
            })
          }
        }
        return this
      },
      setData: function (this: any, a: any) {
        var b: any = a.data
        var c: any = b.length
        this._data = []
        this._radi = []
        for (var d: any = 0; d < c; d++) {
          this._organiseData(b[d], false)
        }
        this._max = a.max
        this._min = a.min || 0
        this._onExtremaChange()
        this._coordinator.emit('renderall', this._getInternalData())
        return this
      },
      removeData: function () {},
      setDataMax: function (this: any, a: any) {
        this._max = a
        this._onExtremaChange()
        this._coordinator.emit('renderall', this._getInternalData())
        return this
      },
      setDataMin: function (this: any, a: any) {
        this._min = a
        this._onExtremaChange()
        this._coordinator.emit('renderall', this._getInternalData())
        return this
      },
      setCoordinator: function (this: any, a: any) {
        this._coordinator = a
      },
      _getInternalData: function (this: any) {
        return {
          max: this._max,
          min: this._min,
          data: this._data,
          radi: this._radi
        }
      },
      getData: function (this: any) {
        return this._unOrganizeData()
      }
    }
    return b
  })()
  var c: any = (function i() {
    var a: any = function (a: any) {
      var b: any = a.gradient || a.defaultGradient
      var c: any = document.createElement('canvas')
      var d: any = c.getContext('2d')
      c.width = 256
      c.height = 1
      var e: any = d!.createLinearGradient(0, 0, 256, 1)
      for (var f in b) {
        e.addColorStop(f, b[f])
      }
      d!.fillStyle = e
      d!.fillRect(0, 0, 256, 1)
      return d!.getImageData(0, 0, 256, 1).data
    }
    var b: any = function (a: any, b: any) {
      var c: any = document.createElement('canvas')
      var d: any = c.getContext('2d')
      var e: any = a
      var f: any = a
      c.width = c.height = a * 2
      if (b == 1) {
        d!.beginPath()
        d!.arc(e, f, a, 0, 2 * Math.PI, false)
        d!.fillStyle = 'rgba(0,0,0,1)'
        d!.fill()
      } else {
        var g: any = d!.createRadialGradient(e, f, a * b, e, f, a)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        d!.fillStyle = g
        d!.fillRect(0, 0, 2 * a, 2 * a)
      }
      return c
    }
    var c: any = function (a: any) {
      var b: any = []
      var c: any = a.min
      var d: any = a.max
      var e: any = a.radi
      var a: any = a.data
      var f: any = Object.keys(a)
      var g: any = f.length
      while (g--) {
        var h: any = f[g]
        var i: any = Object.keys(a[h])
        var j: any = i.length
        while (j--) {
          var k: any = i[j]
          var l: any = a[h][k]
          var m: any = e[h][k]
          b.push({ x: h, y: k, value: l, radius: m })
        }
      }
      return { min: c, max: d, data: b }
    }
    function d(this: any, b: any) {
      var c: any = b.container
      var d: any = (this.shadowCanvas = document.createElement('canvas'))
      var e: any = (this.canvas = b.canvas || document.createElement('canvas'))
      var f: any = (this._renderBoundaries = [1e4, 1e4, 0, 0])
      var g: any = getComputedStyle(b.container) || {}
      e.className = 'heatmap-canvas'
      this._width = e.width = d.width = b.width || +g.width.replace(/px/, '')
      this._height =
        e.height =
        d.height =
          b.height || +g.height.replace(/px/, '')
      this.shadowCtx = d.getContext('2d')
      this.ctx = e.getContext('2d')
      e.style.cssText = d.style.cssText = 'position:absolute;left:0;top:0;'
      c.style.position = 'relative'
      c.appendChild(e)
      this._palette = a(b)
      this._templates = {}
      this._setStyles(b)
    }
    d.prototype = {
      renderPartial: function (this: any, a: any) {
        if (a.data.length > 0) {
          this._drawAlpha(a)
          this._colorize()
        }
      },
      renderAll: function (this: any, a: any) {
        this._clear()
        if (a.data.length > 0) {
          this._drawAlpha(c(a))
          this._colorize()
        }
      },
      _updateGradient: function (this: any, b: any) {
        this._palette = a(b)
      },
      updateConfig: function (this: any, a: any) {
        if (a['gradient']) {
          this._updateGradient(a)
        }
        this._setStyles(a)
      },
      setDimensions: function (this: any, a: any, b: any) {
        this._width = a
        this._height = b
        this.canvas.width = this.shadowCanvas.width = a
        this.canvas.height = this.shadowCanvas.height = b
      },
      _clear: function (this: any) {
        this.shadowCtx.clearRect(0, 0, this._width, this._height)
        this.ctx.clearRect(0, 0, this._width, this._height)
      },
      _setStyles: function (this: any, a: any) {
        this._blur = a.blur == 0 ? 0 : a.blur || a.defaultBlur
        if (a.backgroundColor) {
          this.canvas.style.backgroundColor = a.backgroundColor
        }
        this._width =
          this.canvas.width =
          this.shadowCanvas.width =
            a.width || this._width
        this._height =
          this.canvas.height =
          this.shadowCanvas.height =
            a.height || this._height
        this._opacity = (a.opacity || 0) * 255
        this._maxOpacity = (a.maxOpacity || a.defaultMaxOpacity) * 255
        this._minOpacity = (a.minOpacity || a.defaultMinOpacity) * 255
        this._useGradientOpacity = !!a.useGradientOpacity
      },
      _drawAlpha: function (this: any, a: any) {
        var c: any = (this._min = a.min)
        var d: any = (this._max = a.max)
        var a: any = a.data || []
        var e: any = a.length
        var f: any = 1 - this._blur
        while (e--) {
          var g: any = a[e]
          var h: any = g.x
          var i: any = g.y
          var j: any = g.radius
          var k: any = Math.min(g.value, d)
          var l: any = h - j
          var m: any = i - j
          var n: any = this.shadowCtx
          var o: any
          if (!this._templates[j]) {
            this._templates[j] = o = b(j, f)
          } else {
            o = this._templates[j]
          }
          var p: any = (k - c) / (d - c)
          n.globalAlpha = p < 0.01 ? 0.01 : p
          n.drawImage(o, l, m)
          if (l < this._renderBoundaries[0]) {
            this._renderBoundaries[0] = l
          }
          if (m < this._renderBoundaries[1]) {
            this._renderBoundaries[1] = m
          }
          if (l + 2 * j > this._renderBoundaries[2]) {
            this._renderBoundaries[2] = l + 2 * j
          }
          if (m + 2 * j > this._renderBoundaries[3]) {
            this._renderBoundaries[3] = m + 2 * j
          }
        }
      },
      _colorize: function (this: any) {
        var a: any = this._renderBoundaries[0]
        var b: any = this._renderBoundaries[1]
        var c: any = this._renderBoundaries[2] - a
        var d: any = this._renderBoundaries[3] - b
        var e: any = this._width
        var f: any = this._height
        var g: any = this._opacity
        var h: any = this._maxOpacity
        var i: any = this._minOpacity
        var j: any = this._useGradientOpacity
        if (a < 0) {
          a = 0
        }
        if (b < 0) {
          b = 0
        }
        if (a + c > e) {
          c = e - a
        }
        if (b + d > f) {
          d = f - b
        }
        var k: any = this.shadowCtx.getImageData(a, b, c, d)
        var l: any = k.data
        var m: any = l.length
        var n: any = this._palette
        for (var o: any = 3; o < m; o += 4) {
          var p: any = l[o]
          var q: any = p * 4
          if (!q) {
            continue
          }
          var r: any
          if (g > 0) {
            r = g
          } else {
            if (p < h) {
              if (p < i) {
                r = i
              } else {
                r = p
              }
            } else {
              r = h
            }
          }
          l[o - 3] = n[q]
          l[o - 2] = n[q + 1]
          l[o - 1] = n[q + 2]
          l[o] = j ? n[q + 3] : r
        }
        // k.data = l
        this.ctx.putImageData(k, a, b)
        this._renderBoundaries = [1e3, 1e3, 0, 0]
      },
      getValueAt: function (this: any, a: any) {
        var b: any
        var c: any = this.shadowCtx
        var d: any = c.getImageData(a.x, a.y, 1, 1)
        var e: any = d.data[3]
        var f: any = this._max
        var g: any = this._min
        b = (Math.abs(f - g) * (e / 255)) >> 0
        return b
      },
      getDataURL: function (this: any) {
        return this.canvas.toDataURL()
      }
    }
    return d
  })()
  var d: any = (function j() {
    var b: any = false
    if (a['defaultRenderer'] === 'canvas2d') {
      b = c
    }
    return b
  })()
  var e: any = {
    merge: function () {
      var a: any = {}
      var b: any = arguments.length
      for (var c: any = 0; c < b; c++) {
        var d: any = arguments[c]
        for (var e in d) {
          a[e] = d[e]
        }
      }
      return a
    }
  }
  var f: any = (function k() {
    var c: any = (function h() {
      function a(this: any) {
        this.cStore = {}
      }
      a.prototype = {
        on: function (this: any, a: any, b: any, c: any) {
          var d: any = this.cStore
          if (!d[a]) {
            d[a] = []
          }
          d[a].push(function (a: any) {
            return b.call(c, a)
          })
        },
        emit: function (this: any, a: any, b: any) {
          var c: any = this.cStore
          if (c[a]) {
            var d: any = c[a].length
            for (var e: any = 0; e < d; e++) {
              var f: any = c[a][e]
              f(b)
            }
          }
        }
      }
      return a
    })()
    var f: any = function (a: any) {
      var b: any = a._renderer
      var c: any = a._coordinator
      var d: any = a._store
      c.on('renderpartial', b.renderPartial, b)
      c.on('renderall', b.renderAll, b)
      c.on('extremachange', function (b: any) {
        a._config.onExtremaChange &&
          a._config.onExtremaChange({
            min: b.min,
            max: b.max,
            gradient: a._config['gradient'] || a._config['defaultGradient']
          })
      })
      d.setCoordinator(c)
    }
    function g(this: any) {
      var g: any = (this._config = e.merge(a, arguments[0] || {}))
      this._coordinator = new (c as any)()
      if (g['plugin']) {
        var h: any = g['plugin']
        if (!a.plugins[h]) {
          throw new Error(
            "Plugin '" + h + "' not found. Maybe it was not registered."
          )
        } else {
          var i: any = a.plugins[h]
          this._renderer = new i.renderer(g)
          this._store = new i.store(g)
        }
      } else {
        this._renderer = new d(g)
        this._store = new (b as any)(g)
      }
      f(this)
    }
    g.prototype = {
      addData: function (this: any) {
        this._store.addData.apply(this._store, arguments)
        return this
      },
      removeData: function (this: any) {
        this._store.removeData &&
          this._store.removeData.apply(this._store, arguments)
        return this
      },
      setData: function (this: any) {
        this._store.setData.apply(this._store, arguments)
        return this
      },
      setDataMax: function (this: any) {
        this._store.setDataMax.apply(this._store, arguments)
        return this
      },
      setDataMin: function (this: any) {
        this._store.setDataMin.apply(this._store, arguments)
        return this
      },
      configure: function (this: any, a: any) {
        this._config = e.merge(this._config, a)
        this._renderer.updateConfig(this._config)
        this._coordinator.emit('renderall', this._store._getInternalData())
        return this
      },
      repaint: function (this: any) {
        this._coordinator.emit('renderall', this._store._getInternalData())
        return this
      },
      getData: function (this: any) {
        return this._store.getData()
      },
      getDataURL: function (this: any) {
        return this._renderer.getDataURL()
      },
      getValueAt: function (this: any, a: any) {
        if (this._store.getValueAt) {
          return this._store.getValueAt(a)
        } else if (this._renderer.getValueAt) {
          return this._renderer.getValueAt(a)
        } else {
          return null
        }
      }
    }
    return g
  })()
  var g: any = {
    create: function (a: any) {
      return new (f as any)(a)
    },
    register: function (b: any, c: any) {
      a.plugins[b] = c
    }
  }

  return g
}
export default h337();