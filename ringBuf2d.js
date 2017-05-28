function Buf2d(x, y, w2n, h2n, onfill, onmove){ //syntax: Buf2d([x, y,] w2n, h2n[, onfill, onmove])
	if(arguments.length < 4 || typeof w2n == 'function') onmove = h2n, onfill = w2n, h2n = y, w2n = x, y = 0, x = 0;
	var _ = function(x, y){return buf[y & H][x & W]}
	_.onfill = function(f){onfill = f; return _};
	_.onmove = function(f){onmove = f; return _};
	var _w = 1 << w2n, _h = 1 << h2n, W = _w - 1, H = _h - 1, _x = x, _y = y, tmr = 0, _T = 0, _X, _Y = _X = Number.POSITIVE_INFINITY;
	for(var buf = []; buf.push(new Array(_w)) < _h;);
	
	Object.defineProperties(_,{
		'w':{value:_w}, 'h':{value:_h}, //TODO: dynamic resize?
		'x':{get:function(){return _X}, set:function(x){_.moveTo(x,_y) } },
		'y':{get:function(){return _Y}, set:function(y){_.moveTo(_x,y) } }
	});
	_.put = function(x, y, w, dat){
		if(arguments.length == 3) buf[y & H][x & W] = w;
		else if(dat.constructor === Array)
			for(var i=x, j=y, n = 0, m = dat.length; n < m; n++, i = x + n % w, j = (0 | n / w) + y)
				//if(_x <= i && i < _x + _w && _y <= j && j < _y + _h) //crop data to actual coords, uncomment for async safety 100%
					buf[j&H][i&W] = dat[n];
		return _;
	}
	_.moveBy = function(x,y){_.moveTo(_x + x, _y + y)}
	_.moveTo = function(x,y){
		if( 0 > (x = (onmove && onmove(_X - (_x = x), _Y - (_y = y), (new Date()).getTime() - _T ) ) || 0) && onfill ) _.fill()
		else if(x >= 1) clearTimeout(tmr), tmr = setTimeout(_.moveBy.bind(this,0,0), x); //agregate moves tmr (only if current is null)
		return _;
	}
	_.fill = function(){
		var x = Math.ceil(_x), y = Math.ceil(_y);
		var dx = Math.min(Math.max(_X - x, -_w), _w), sx = dx >>> 31, x1 = x+sx*(dx+_w),
			dy = Math.min(Math.max(_Y - y, -_h), _h), sy = dy >>> 31, y1 = y+sy*(dy+_h),
			a, dy2 = dy+sy*(_h-dy), x2 = x+dx+sx*(_w-dx);
		_X = x, _Y = y, _T = (new Date()).getTime();
		if(!onfill) return _;
		if(dy && (a = onfill.call(_, x, y1, x + _w, y+dy2) ) && a.constructor == Array) _.put(x, y1, _w, a);
		if(dx && (a = onfill.call(_, x1, y1=y+(sy?0:dy2), x2, y+ (dy?(sy?dy2:_h):_h) ) ) && a.constructor == Array) _.put(x1, y1, x2-x1, a);
		return _;
	}
	return _;
}