function Buf2d(x, y, w2n, h2n, onfill, onmove){ //syntax: Buf2d([x, y,] w2n, h2n[, onfill, onmove])
	if(arguments.length < 4 || typeof w2n == 'function') onmove = h2n, onfill = w2n, h2n = y, w2n = x, x = y = Infinity;
	var _ = function(x, y){return buf[y & H][x & W]}
	_.onfill = function(f){onfill = f; return _};
	_.onmove = function(f){onmove = f; return _};
	var _w = 1 << w2n, _h = 1 << h2n, W = _w - 1, H = _h - 1, _x = x, _y = y, tmr = 0, _T = 0, _X, _Y = _X = Infinity;
	for(var buf = []; buf.push(new Array(_w)) < _h;);
	Object.defineProperties(_,{
		'w':{value:_w}, 'h':{value:_h}, //TODO: dynamic resize?
		'x':{get:function(){return _X}, set:function(x){_.moveTo(x,_y) } },
		'y':{get:function(){return _Y}, set:function(y){_.moveTo(_x,y) } }
	});
	_.put = function(x, y, dat, w){
		w = w || _w;
		if(_x == Infinity || _y == Infinity) _.moveTo(x,y);
		//^^^^?
		if(dat.constructor !== Array) buf[y & H][x & W] = w;
		else for(var i=x, j=y, n = 0, m = dat.length; n < m; n++, i = x + n % w, j = (0 | n / w) + y)
				//if(_x <= i && i < _x + _w && _y <= j && j < _y + _h) //crop data to actual coords, uncomment for async safety 100%
					buf[j&H][i&W] = dat[n];
		return _;
	}
	_.moveBy = function(x,y){_.moveTo(_x + (x || 0), _y + (y || 0))}
	_.moveTo = function(x,y){
		_x = x || 0; _y = y || 0;
		if( 0 >= (x = (onmove && onmove.call(_,_X - _x, _Y - _y, (new Date()).getTime() - _T ) ) || 0) ){
			var x = Math.ceil(_x), y = Math.ceil(_y);
			var dx = Math.min(Math.max(_X - x, -_w), _w), sx = dx >>> 31, x1 = x+sx*(dx+_w),
				dy = Math.min(Math.max(_Y - y, -_h), _h), sy = dy >>> 31, y1 = y+sy*(dy+_h),
				a, dy2 = dy+sy*(_h-dy), x2 = x+dx+sx*(_w-dx);
			_X = x, _Y = y, _T = (new Date()).getTime();
			if(!onfill) return _;
			if(dy && (a = onfill.call(_, x, y1, _w, y+dy2-y1) ) && a.constructor == Array) _.put(x, y1, a, _w);
			if(dx && (sy?-dy:dy) < _h && (a = onfill.call(_, x1, y1=y+(sy?0:dy2), x2-x1, y+ (dy?(sy?dy2:_h):_h)-y1 ) ) && a.constructor == Array)
				_.put(x1, y1, a, x2-x1);
		}else if(x > 0){
			clearTimeout(tmr);
			tmr = setTimeout(_.moveBy.bind(this), x); //agregate moves tmr (only if current is null)
		}
		return _;
	}
	if(_x !== Infinity && _y !== Infinity) setTimeout(_.moveBy.bind(this),111);
	return _;
}