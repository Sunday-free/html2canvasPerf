function createMVTWithStyle(e, t, i, r) {
	function n(r) {
		r = r, this._tilingScheme = e.defined(r.tilingScheme) ? r.tilingScheme :
			new e.WebMercatorTilingScheme({
				ellipsoid: r.ellipsoid
			}), this._tileWidth = e.defaultValue(r.tileWidth, 512), this._tileHeight = e.defaultValue(r.tileHeight, 512), this._readyPromise =
			e.when.resolve(!0), this._ol = t, this._mvtParser = new this._ol.format.MVT, this._styleFun = i, this._key = e.defaultValue(
				r.key, ""), this._url = e.defaultValue(r.url, "");
		var n = this._tilingScheme._rectangleSouthwestInMeters,
			l = this._tilingScheme._rectangleNortheastInMeters,
			a = [n.x, n.y, l.x, l.y];
		this._resolutions = t.tilegrid.resolutionsFromExtent(a, 22, this._tileWidth), this._pixelRatio = 1, this._transform = [
				.125, 0, 0, .125, 0, 0
			], this._replays = ["Default", "Image", "Polygon", "LineString", "Text"], this._tileQueue = new e.TileReplacementQueue,
			this._cacheSize = 1e3
	}

	function l(e, t) {
		var i = t.replacementPrevious,
			r = t.replacementNext;
		t === e._lastBeforeStartOfFrame && (e._lastBeforeStartOfFrame = r), t === e.head ? e.head = r : i.replacementNext = r,
			t === e.tail ? e.tail = i : r.replacementPrevious = i, t.replacementPrevious = void 0, t.replacementNext = void 0,
			--e.count
	}


	 Object.defineProperties(n.prototype, {
		proxy: {
			get: function() {}
		},
		tileWidth: {
			get: function() {
				return this._tileWidth
			}
		},
		tileHeight: {
			get: function() {
				return this._tileHeight
			}
		},
		maximumLevel: {
			get: function() {}
		},
		minimumLevel: {
			get: function() {}
		},
		tilingScheme: {
			get: function() {
				return this._tilingScheme
			}
		},
		rectangle: {
			get: function() {
				return this._tilingScheme.rectangle
			}
		},
		tileDiscardPolicy: {
			get: function() {}
		},
		errorEvent: {
			get: function() {
				return this._errorEvent
			}
		},
		ready: {
			get: function() {
				return !0
			}
		},
		readyPromise: {
			get: function() {
				return this._readyPromise
			}
		},
		credit: {
			get: function() {}
		},
		hasAlphaChannel: {
			get: function() {
				return !0
			}
		}
	}),
		n.prototype.getTileCredits = function(e, t, i) {},
		n.prototype.requestImage = function(i, r, n, a) {
		var u = function(e, t, i, r) {
			for (var n = r.head; null != n && (n.xMvt != e || n.yMvt != t || n.zMvt != i);) n = n.replacementNext;
			return n
		}(i, r, n, this._tileQueue);
		if (null != u) return u;
		var o = this,
			c = this._url;
		if (c) {

			c =  c.replace("{x}", i).replace("{y}", r).replace("{z}", n);
			(function(i, r, a) {
				e.Resource.createIfNeeded(c).fetchArrayBuffer().then(function(u) {

					var c = document.createElement("canvas");
					c.width = 512, c.height = 512;
					for (var s = c.getContext("2d"), h = o._mvtParser.readFeatures(u), f = o._styleFun(), _ = new t.render.canvas.ReplayGroup(
							0, [0, 0, 4096, 4096], 8, !0, 100), d = 0; d < h.length; d++) {
						var g = h[d];

						for (var m = f(h[d], o._resolutions[n]), p = 0; p < m.length; p++) t.renderer.vector.renderFeature_(_, g, m[p],
							16)
					}
					return _.finish(), _.replay(s, o._pixelRatio, o._transform, 0, {}, o._replays, !0), o._tileQueue.count > o._cacheSize &&
						function(t, i) {
							for (var r = t.tail; t.count > i && e.defined(r);) {
								var n = r.replacementPrevious;
								l(t, r), delete r, r = null, r = n
							}
						}(o._tileQueue, o._cacheSize / 2), c.xMvt = i, c.yMvt = r, c.zMvt = a, o._tileQueue.markTileRendered(c),
						delete _, _ = null, c
				}).otherwise(function(ex) {
				})
			})(i, r, n)
		}
	},
		n.prototype.pickFeatures = function(e, t, i, r, n) {}
	return	new n(r)
}
