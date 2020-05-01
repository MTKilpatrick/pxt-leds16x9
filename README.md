## myscroll:bit

This driver suite for the **Pimoroni scroll:bit** 17x7 LED display replaces the original driver.
A greater range of pixel, line, image, text and display manipulation functions are provided.
Basic pixel functions are also faster but individual pixel brightness, an expensive overhead, has been dispensed with.
 
Most operations are dependent on the draw mode as set by `setDrawMode()` and the use of a buffer (array) to store the
intended state of the **scroll:bit** display. In the `Off` drawing mode any changes to pixels
occur only in the buffer until such time as the buffer is sent to the LED matric by a `show()` command.
In the `On` drawing mode the LED matrix is updated with every single operation. This can be slower than
performing a single `show()` after several partial image changes.

### `setPixel()` - set a pixel on/off

Light or clear a single pixel with an x-coordinate and y-coordinate. The top-left corner is (0,0).
The brightness of the pixel is defined by the global brightness - see `setAllBrightness()`.

Lighting a pixel with `setPixel(x, y, true)` does not have any effect on the blink status of a pixel.
If the draw mode is set to `Off` the LED matrix will not be updated until a call to `show()`.
Clearing a pixel with `setPixel(x, y, false)` also clears the blink state of the pixel.

In `On` draw mode the necessary column of the LED matrix will be updated immediately,
including any other pixels in that column which were changed since the last display update.


* `x` - the column, from 0-17
* `y` - the row, from 0-7
* `state` - on/off (boolean)

Note that column (x = 17) exists to the far right in the pixel buffer and may be set, but it is not visible.
Likewise pixels in row (y = 7) existsin the buffer but are not visible off the bottom of the LED display.

```typescript
myscrollbit.setPixel(x: number, y: number, state: boolean)
```

For example:

```blocks
myscrollbit.setPixel(5, 5, true)
```


### `blinkPixel()` - blink or unblink a pixel

The blink frequency and blink enable for all pixels are globally determined - see `setBlinkMode()`.
Setting a pixel to blink using `blinkPixel()` with blink mode disabled will have no effect.
In the `Off` draw mode a `show()` is required to update the LED matrix.
A call to `blinkPixel()` does not light the pixel - a call to `setPixel()` is also required.
It follows that the blink status may be repeatedly altered with the pixel remaining in the lit state.


* `x` is the column, from 0-17
* `y` is the row, from 0-7
* `blink`  - on/off blink status (boolean)

```typescript
myscrollbit.blinkPixel(x: number, y: number, blink: boolean)
```

For example:

```typescript
myscrollbit.setPixel(2, 6, true)
myscrollbit.blinkPixel(2, 6, true)
```

### `plotLine()`  - plot/unplot a line

A line-drawing function which will plot or unplot a line between two given points (x0,y0) and (x1,y1).
The Bresenham algorithm is modified to ensure symmetry of lines drawn on a small display.
In the `Off` draw mode a `show()` is required to update the LED matrix.
In `On` draw mode all affected columns of the LED matrix will be updated immediately but for a line of
more than a couple of pixels this operation will be slower than using `Off` mode followed by `show()` 

* `x0` is the column, from 0-17
* `y0` is the row, from 0-7
* `x1` is the column, from 0-17
* `y1` is the row, from 0-7
* `state` - on/off (boolean)

```typescript
myscrollbit.plotLine(x0: number, y0: number, x1: number, y1: number, state: boolean)
```

For example:

```typescript
myscrollbit.plotLine(2, 6, 16, 0, true)
```

### `isPixel()` - is a pixel set?

Return a boolean true/false for the lit state of a pixel independent of its blink status.
The status of the pixel is determined by the pixel buffer, not the physical state of the LED matrix and so
is independent of the draw mode and independent of whether a `show()` has been issued. Furthermore, column (x = 17) and
row (y = 7) pixels may be quiered from the buffer even though they have no physical LED in the matrix.

* `x` is the column, from 0-17
* `y` is the row, from 0-7

```typescript
myscrollbit.isPixel(x: number, y: number)
```

For example:

```blocks
if (myscrollbit.isPixel(5, 5)) {
    doSomething()
}
```

### `clear()` - clear the display buffer(s)

Clear the contents of the pixel buffer and the blink buffer. In the `On` draw mode this will clear the LED matrix
immediately but in `Off` draw mode a call to `show()` is required to update the LED display.

```
myscrollbit.clear()
```


### `show()` - update the Scroll:bit display 

The entire LED matrix is updated by transferring all 18 bytes of the pixel buffer to the **scroll:bit** display.
If the blink mode is enabled - see `setBlinkMode()` - the blink buffer will also be transferred.
Updating the display is therefore quicker when blink mode is disabled.


```
myscrollbit.show()
```

### `scrollDisplay()` - scroll the whole image pixel-wise

The display buffer is shifted left, right, up or down a single pixel.
The LED display is not updated unless the draw mode is set to `On`.
The behaviours of the four directional shifts are a little different:
`Left` - brings invisible column 17 into view on the right of the display buffer. Data from column 0 will be lost.
`Right` - places a column of zeros in the left of the buffer. Column 16 will be preserved in column 17 of the buffer.
`Up` - brings invisible row 0 into view at the bottom of the display buffer. Data from row 0 will be lost.
`Down` - places a row of zeros in the top of the buffer and preserves data from row 6 in the invisible row 7.

* `direction` is the direction: Right, Down, Left, Up [0-3]

```typescript
myscrollbit.scrollDisplay(direction: number)
```

For example:

```blocks
myscrollbit.scrollDisplay(Scrolls.Left)
myscrollbit.scrollDisplay(1)
```

### `scrollText()` - scroll text across

The text scrolling function is enhanced by the facility to preserve any image already displayed on the **scroll:bit**
and/or existing in the display buffer.
This is achieved by using a different frame of the driver IC - see `setWriteFrame()` and `setDisplayFrame()` for further details
on the frames.

After the LED matrix is cleared, a text string is scrolled from right to left at a controllable speed.
When the scroll is complete the display and the display buffer are restored to their previous state allowing
other graphical displays to continue without additional retorative commands.


* `text` - the text to display
* `delay` (optional) - the time (ms) delay for each scroll step
* `y` (optional) - the vertical offset [0-2] of the bottom of the text from the bottom of the screen, row 6)
* 

```
myscrollbit.scrollText(text: string, delay: number = 50, y: number = 1)
```

For example:

```
myscrollbit.scrollText("The quick brown fox jumps over the lazy dog!", 128, 0)
```

### `drawText()` - draw text

Show a string of text on scroll:bit at a given position (x,y) without scrolling. The text may contain Micro:bit
icons by name, enclosed within `{}` parentheses.

* `text` is the text to display
* `x` is the column, from 0-17
* `y` is the row, from 0-7

```
myscrollbit.drawText(text: string, x: number, y: number)
```

For example:

```
myscrollbit.drawText("Hello World", 0, 1)
myscrollbit.drawText("Hello {Happy} World", 0, 1)
```

### `drawChar` - draw a single character

Display a single text character at a given position.

* `char` is the character to display
* `x` is the column, from 0-17
* `y` is the row, from 0-7

```
myscrollbit.drawChar(text: string, x: number, y: number)
```

For example:

```
myscrollbit.drawChar('H', 3,3)
```

### Measure a text string

It can be useful to know how long a string of text might be, in pixels, on scroll:bit. Use `measureText` to find out:

```
myscrollbit.measureText(text: string)
```

For example:

```
let width: number = myscrollbit.measureText("Hello World")
```

This will return a number of pixels corresponding to the length of the text as it's displayed on scroll:bit (using the built-in 5x5 micro:bit font).

### Icons & Arrows

You can use icons and arrows in your text, just place their name in curly brackets like so: `"Hello {Heart} World"` or: `"Boo! Went the {Ghost}"` or: `"{Heart}{SmallHeart}{Heart} Happy Birthday! {Heart}{SmallHeart}{Heart}"`

Here's a list of icons you can use:

* Heart
* SmallHeart
* Yes
* No
* Happy
* Sad
* Confused
* Angry
* Asleep
* Surprised
* Silly
* Fabulous
* Meh
* TShirt
* Rollerskate
* Duck
* House
* Tortoise
* Butterfly
* StickFigure
* Ghost
* Sword
* Giraffe
* Skull
* Umbrella
* Snake
* Rabbit
* Cow
* QuarterNote
* EigthNote
* Pitchfork
* Target
* Triangle
* LeftTriangle
* Chessboard
* Diamond
* SmallDiamond
* Square
* SmallSquare
* Scissors
* North
* NorthEast
* East
* SouthEast
* South
* SouthWest
* West
* NorthWest

## License

MIT License


Copyright (c) 2020 Michael Kilpatrick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

This software is an almost
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Copyright (c) 2018 Pimoroni Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Supported targets

* for PXT/microbit

```package
myscrollbit=github:MTKilpatrick/pxt-myscrollbit
```
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
