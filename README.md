## RING (кольцевой) буфер — 2D cлучай

Live Demo - <https://impfromliga.github.io/ringBuf2d/>

Суть кольцевого буфера, - логическое перемещение данных, без их физического перемещения. Между предствалением буфера (через API) и моделью хранения (реально выделенной памятью) работает индексация, а все перемещения лишь перестраивают её контрольные точки. Это работает очень быстро, максимально сохраняя актуальные данные физически нетронутыми, а память от высвобождаемых данных сразу же переиспользуется под новые.

1. Наиболее общим направлением использования является скроллинг двумерных данных больших объемов (в т.ч. безконечных, в т.ч. асинхронно)
2. Частным применением может являться использование 2d буфера как алгоритма закольцовывания участка двумерной карты (что упростит так же адаптацию алгоритмов предназначенных для работы на плоскости к работе на кольцевом буфере)

Предыдущая статья <http://habrahabr.ru/post/280830/> была обзорной, более подробно изучить принцип работы вы можете там. Теперь же есть модуль, с удобными возможностями и высокой гибкостью к расширению, здесь я опишe особенности реализации и синтаксис:
***
- Мировыми или глобальными называются координаты относительно всей карты на сервере (или по средствам генератора).
- Координатами буфера или Локации называется точка на мировой карте, где находиться в данный момент верхний левый угол буфера.
- Локальными координатами называется смещение объекта относительно левого верхнего угла буфера.


1. Конструктор создает двумерный массив и обеспечивает прозрачный доступ по индексам (как будто буфер бесконечен):
```javascript
var buf2d = Buf2d([x, y,] w2n, h2n [,filler, mover]) /* где
x, y - начальные координаты локации/буфера (опционально, поумолчанию 0, 0)
w2n, h2n - ширина/высота буфера в виде показателя степени 2 (w = 2 ** w2n)
filler, mover - обработчики событий, описаны ниже (опционально) */	
```
  * Поддерживается так же установка через .onfill(filler) .onmove(mover) цепочные вызовы и другие цепочные функции (все они возвращают сам объект)
2. Чтение запись координат буфера:
```javascript
buf2d.moveTo(x, y) //где x, y - устанавливаемые ПЛАНИРУЕМЫЕ координаты буфера (опциональны, умолчание 0, 0) 
buf2d.moveBy(dx, dy) // где dx, dy - относительные смещения ПЛАНИРУЕМОЙ позиции (опциональны, умолчание 0, 0)
buf2d.x, buf2d.y - свойства для чтения ТЕКУЩИХ координат буфера, и для записи ПЛАНИРУЕМЫХ.
```
  * !Важно при чтении возвращается ТЕКУЩЕЕ положение, и при записи оно не меняется до тех пор, пока не отработают mover/filler поэтому невозможно получить прямо положение ПЛАНИРУЕМЫХ координат кеширующей области буфера, кроме как в функции mover() используя метод .moveBy
  * Сдвигаясь буфер сам заполняется, вызывая filler().
  * Если filler() не назначен, - данные в буфере лишь смещаются кольцевым образом не переписываясь.
3. onfill(filler) функция обработчик вызывается для очередной необходимой прямоугольной области. (Это позволит удобно сделать функцию загрузки/генерации данных, поддерживается в частности асинхронный режим)
```javascript
buf2d.onfill( (Array) filler(x, y, w, h)) /* установка обработчика, где
  filler(x, y, w, h) - функция заполнитель, принимающая
	x, y - мировые координаты левого верхнего угла обновляемой зоны
	w, h - ее ширина/высота
	this - буфер (позволяет использовать цепочку на конструкторе, пока переменная еще не определена)
	(Array) - возвращает одномерный массив обходящий в книжном порядке все запрошенные буфером элементы */
```
  * Логикой разбиения запросов прямоугольников к filler() можно манипулировать! Для этого вызов filler() предваряется проверкой значения функции mover(), которая может проанализировав запрос отложить его для агрегации.
  * Если mover() не назначен, filler() будет вызываться для заполнения при первой необходимости.
4. onmove(mover) функция обработчик получив параметры смещения, согласно собственной логике может либо вернуть интервал отсрочки ms>=1, либо ms<=0 или undefined разрешая тем самым моментальный запуск filler()
```javascript
buf2d.onmove( (Int) mover(dx, dy, dt)) /* установка обработчика, где
  mover(dx, dy, dt) - функция управления смещением и отсрочкой агрегации, принимающая:
	dx, dy - координаты относительного смещения буфера ПЛАНИРУЕМОЕ -ТЕКУЩЕЕ
	dt - время задержки с момента рассинхронизации планируемого и фактического положений буфера
	this - буфер (позволяет использовать цепочку на конструкторе, пока переменная еще не определена)
	(Int) - возвращаемое значение отсрочка агрегации в микросекундах (опционально) */
```
  * Во первых, получая информацию о смещении dx,dy, может каким либо образом оптимизировать смещение нетронутой области на рендере. (например осуществить плавное попиксельное смещение посредствам css)
  * Во вторых управлять агрегацией вызовов посредствам ожидания в dx,dy некоего минимального смещения или/и максимально допустимого времени dt отсрочки.
  * Если mover() устанавливает отсрочку, то при повторном вызове функция получит общее накопленное смещение. (Это позволяет балансировать нагрузку на сеть/генератор гибко разменивая на нее своевременность заполнения)
  * Если вы используете дробные смещения, на moveBy(), они будут накапливаться и приходить ТОЛЬКО в mover(dx,dy)! В filler() же всегда приходят только ЦЕЛЫЕ координаты клеток! (что удобно для написания заполняющей функции) Это следует из того, что позиция ТЕКУЩИХ координат буфера .x .y может быть только целой (нельзя логически загрузить пол ячейки), в то время как ПЛАНИРУЕМАЯ позиция может накапливаться.
5. Чтение элемента из буфера производиться обращением к объекту буфера как к функции:
```javascript
buf2d(x, y) // где x, y - мировые координаты нужной ячейки
```
6. Запись элемента (массива элементов) в буфер осуществляется через метод put:
```javascript
buf2d.put(x, y, value) /* где:
	x, y - мировым координаты целевой ячейки
	value - помещаемое в ячейку значение */
buf2d.put(x, y, data, w) /* где:
	x, y - мировые координаты левого верхнего угла записываемого прямоугольного участка,
	data - одномерный массив для заполнения прямоугольного участка в книжном порядке,
	w - ширина участка */
```
  * именно эта функция позволяет реализовать отложенный filler
  * проверка соответствия координат буфера с возможностью записать ячейку по данным координатам по умолчанию отключена ради максимальной скорости (см. исходный код метода put)
  * в случае если начальные координаты буфера не были проинициализированны ни одним способом, этот метод установит буфер в позицию x, y
7. Начальная инициализации заполнения буфера функцией filler: 
  * Изначально ТЕКУЩИЕ координаты приравниваются к Infinity, а любые переданные в конструктор x,y становяться ПЛАНИРУЕМЫМИ, до тех пор пока не отработают mover/filler. Пока ПЛАНИРУЕМЫЕ координаты не установлены автоматического запонения не произойдет. Для начальной инициализации установите координаты методом moveTo() или косвенной установкой при методе put()
8. Рекомендуемый порядок просмотра live примеров исходного кода:
  * <https://impfromliga.github.io/ringBuf2d/ex1_onlyCirc.html> - простейший пример использования RING 2D буфера, для реализации лишь логической ротации элементов, внешний простой рендер перебором на requestAnimationFrame 
  * <https://impfromliga.github.io/ringBuf2d/ex2_flowMove.html> - requestAnimationFrame обработчик события замещен на mover для плавного управления смещением на css 
  * <https://impfromliga.github.io/ringBuf2d/ex3_autoFill.html> - функция инициализации буфера преобразована в функцию filler, буфер становиться визуально бесшовным и бесконечным
  * <https://impfromliga.github.io/ringBuf2d/ex4_autoDraw.html> - рендер функция разнесена по обработчикам mover/filler, максимизируется производительность перерисовки
  * <https://impfromliga.github.io/ringBuf2d/ex5_asyncLdr.html> - симуляция асинхронной нестабильной по пингу загрузки
  * <https://impfromliga.github.io/ringBuf2d/ex6_limitLdr.html> - загрузчик лимитирован по растоянию и времени. Буфер теперь подгружается грубо (полная компенсация визуального сдвига на css остается), для большей эффективности загрузки по сети. (см. Изменения в mover)