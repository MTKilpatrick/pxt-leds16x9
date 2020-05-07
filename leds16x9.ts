enum Scrolls {
    //% block="Up"
    Up = 0,
    //% block="Right"
    Right = 1,
    //% block="Down"
    Down = 2,
    //% block="Left"
    Left = 3
}

enum Plots {
    //% block="line"
    Line = 0,
    //% block="box"
    Box = 1,
    //% block="rectangle"
    Rect = 2
}

//% weight=100
//% color=#070373
//% icon="\uf03e"
//% block="leds16x9:Bit"
//% blockGap=8
namespace leds16x9 {

    const SCREEN_WIDTH = 15
    const SCREEN_HEIGHT = 8
    const VIRTUAL_WIDTH = 16
    const VIRTUAL_HEIGHT = 9
    const I2C_ADDR: number = 0x74
    const REG_MODE: number = 0x00
    const REG_FRAME: number = 0x01
    const DISP_REG: number = 0x05
    const REG_AUDIOSYNC: number = 0x06
    const REG_SHUTDOWN: number = 0x0a
    const REG_BRIGHT: number = 0x24
    const REG_BLINK: number = 0x12
    const REG_ENABLE: number = 0x00
    const PIC_MODE: number = 0x00
    const CMD_REG: number = 0xfd
    const BANK_CONFIG: number = 0x0b
    const FILL_X = hex`fffffefcf8f0e0c080 0000000000000000000`
    const FILL_B = hex`000000000000000000000103070f1f3f7fffff`
    const FILL_R = hex`00010204081020408000000000000000000000`
    const FILL_S = hex`00000000000000000001020408102040800000`
    const TWOS = hex`0102040810204080010204081020408000`
    const ARROWOFFSET: number = 40
    const ICONS: string[] = [
        "Heart", "SmallH", "Yes", "No", "Happy",
        "Sad", "Confus", "Angry", "Asleep", "Surpri",
        "Silly", "Fabulo", "Meh", "TShirt", "Roller",
        "Duck", "House", "Tortoi", "Butter", "StickF",
        "Ghost", "Sword", "Giraff", "Skull", "Umbrel",
        "Snake", "Rabbit", "Cow", "Quarte", "EigthN",
        "Pitchf", "Target", "Triang", "LeftTr", "Chessb",
        "Diamon", "SmallD", "Square", "SmallS", "Scisso",
        "North", "NorthE", "East", "SouthE", "South",
        "SouthW", "West", "NorthW"
    ]
    let useBlink: boolean = false
    let frame: number = 0
    let currentWriteFrame: number = 0
    let currentDisplayFrame: number = 0

    let brightness: Buffer = pins.createBuffer(144)
    let pixelbuffer: Buffer = pins.createBuffer(18)
    let pixelblinkbuffer: Buffer = pins.createBuffer(18)
    let textbuffer: Buffer = pins.createBuffer(18)
    let textblinkbuffer: Buffer = pins.createBuffer(18)
    let p_buffer = pixelbuffer
    let b_buffer = pixelblinkbuffer

    // variables for window mode
    let worldbuffer: Buffer = pins.createBuffer(256)
    let useWorld: boolean = false
    let worldFrameX: number = 0
    let worldFrameY: number = 0
    let worldSize: number = 0
    let worldRowMult: number = 0
    let worldWidth: number = 0
    let worldHeight: number = 0
    let wfMaxX: number = 0
    let wfMaxY: number = 0

    //% shim=TD_ID
    //% blockId="dir_conv" block="%dir"
    //% blockHidden=true
    export function dirs(dir: Scrolls): number {
        return (dir || 0)
    }

    //% shim=TD_ID
    //% blockId="plot_conv" block="%plot"
    //% blockHidden=true
    export function pl(plot: Plots): number {
        return (plot || 0)
    }

    /**
     * Set or clearpixel (x,y).
     * LED matrix is not updated until a show() or showColumn()
     * @param x - column to set (0,15)
     * @param y - row to set (0,8)
     * @param state - on/off state
     */
    //% block="pixel at x %x y %y $state"
    //% state.shadow="toggleOnOff" state.defl=true
    //% inlineInputMode=inline
    export function framePixel(x: number, y: number, state: boolean): void {
        if (x > 15) { return }
        if (y > 8) { return }
        if ((x | y) < 0) { return }
        y <<= 1
        if (x > 7) y++
        if (state) {
            p_buffer[y] = p_buffer[y] | TWOS[x]
        } else {
            let bitmask = ~TWOS[x]
            p_buffer[y] = p_buffer[y] & bitmask
            b_buffer[y] = b_buffer[y] & bitmask
        }
    }

    /**
      * Set or clear blink for pixel (x,y).
      * LED matrix is not updated until a show() or showColumn()
      * Requires blink mode - see setBlinkMode()
      * @param x - column to set (0,15)
      * @param y - row to set (0,8)
      * @param blink - on/off blink state
      */
    //% blockID=leds16x9_frame_blink
    //% block="pixel at x %x y %y set blink $blink"
    //% blink.shadow="toggleOnOff" blink.defl=false
    //% inlineInputMode=inline
    export function frameBlink(x: number, y: number, blink: boolean): void {
        if (x > 15) { return }
        if (y > 8) { return }
        if ((x | y) < 0) { return }
        y <<= 1
        if (x > 7) y++
        if (blink) {
            b_buffer[y] = b_buffer[y] | TWOS[x]
        } else {
            b_buffer[y] = b_buffer[y] & ~TWOS[x]
        }
    }

    /**
      * Plot line/box/rectangle between points (x0,y0) (x1,y1)
      * @param plot - plot type: 0 = line, 1 = box, 2 = rectangle
      * @param x0 - column  (0,15)
      * @param y0 - row (0,8)
      * @param x1 - column  (0,15)
      * @param y1 - row (0,8)
      * @param state - on/off state (draw/undraw)
      */
    //% blockId=leds16x9_frame_plot
    //% block="draw %plot=plot_conv from x %x0 y %y0 to x %x1 y %y1 $state"
    //% state.shadow="toggleOnOff" state.defl=true
    //% inlineInputMode=inline
    export function framePlot(plot: Plots, x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        switch (plot) {
            case 0: { plotLine(x0, y0, x1, y1, state); break }
            case 1: { plotBox(x0, y0, x1, y1, state); break }
            case 2: { plotRect(x0, y0, x1, y1, state); break }
            default: plotLine(x0, y0, x1, y1, state);
        }
    }

    /**
     * Scroll pixels (and blinks) up/right/down/left.
     * @param direction - up/right/down/left (0-3)
     */
    //% blockId=leds16x9_frame_scroll
    //% block="scroll scroll:bit %direction=dir_conv"
    export function frameScroll(direction: number): void {
        if (direction & 1) {
            if (direction & 2) {
                for (let i = 0; i < 18; i = i + 2) {
                    p_buffer[i] >>= 1
                    if (p_buffer[i + 1] & 1) { p_buffer[i] |= 0x80 }
                    p_buffer[i + 1] >>= 1
                }
                if (useBlink) {
                    for (let i = 0; i < 18; i = i + 2) {
                        b_buffer[i] >>= 1
                        if (b_buffer[i + 1] & 1) { b_buffer[i] |= 0x80 }
                        b_buffer[i + 1] >>= 1
                    }
                }
            } else {
                for (let i = 0; i < 18; i = i + 2) {
                    p_buffer[i + 1] <<= 1
                    if (p_buffer[i] & 0x80) { p_buffer[i + 1] |= 1 }
                    p_buffer[i] <<= 1
                }
                if (useBlink) {
                    for (let i = 0; i < 18; i = i + 2) {
                        b_buffer[i + 1] <<= 1
                        if (b_buffer[i] & 0x80) { b_buffer[i + 1] |= 1 }
                        b_buffer[i] <<= 1
                    }
                }
            }
        } else {
            let dir = (1 - (direction & 2)) << 1
            p_buffer.shift(dir)
            if (useBlink) {
                b_buffer.shift(dir)
            }
        }
    }

    /**
     * Clear pixel and blink buffers.
     */
    //% blockId=leds16x9_frame_clear
    //% block="clear scroll:bit"
    export function frameClear(): void {
        p_buffer.fill(0)
        b_buffer.fill(0)
    }

    /**
     * Invert the display
     * 
     */
    //% blockId=leds16x9_invert
    //% block="invert display"
    export function frameInvert(): void {
        for (let i = 0; i < 18; i++) {
            p_buffer[i] = ~p_buffer[i]
        }
    }
    /**
     * Transfer pixel (and blink) buffers to LED display.
     * If in World View, displays the World with or without frame overlay.
     */
    //% blockId=leds16x9_show
    //% block="show scroll:bit"
    export function show(): void {
        if (useWorld) {
            showWorld()
        } else {
            showFrame()
        }
    }
    /**
     * Returns boolean - is pixel at (x,y) set?
     * Queries the pixel buffer, NOT the LED display
     * @param x - column (0,17)
     * @param y - row (0,7)
     */
    //% blockID=leds16x9_is_pixel
    //% block="is pixel set at x %x y %y"
    //% x.min=0 y.min=0
    //% inlineInputMode=inline
    export function frameIsPixel(x: number, y: number): boolean {
        if (y > 8) { return false }
        if (x > 15) { return false }
        if ((x | y) < 0) { return false }
        y <<= 1
        if (x > 7) y++
        return ((p_buffer[y] & TWOS[x]) != 0)
    }

    /**
     * Return the maximum x coordinate
     */
    //% blockId=leds16x9_frame_max_x
    //% block="max X of scroll:bit"
    export function frameWidth(): number {
        return 15
    }
    /**
      * Return the maximum y coordinate
      */
    //% blockId=leds16x9_max_y
    //% block="max Y of scroll:bit"
    //% blockGap=40
    export function frameHeight(): number {
        return 8
    }



    /**
     * Scroll text across LED matrix - does not require show()
     * Preseves and restores existing display contents.
     * @param text - text to scroll
     * @param delay - scroll delay in ms
     * @param y - vertical offset [0-3]
     */
    //% blockId=leds16x9_scroll_text 
    //% block="scroll string %text delay (ms) %delay y %y"
    //% delay.min=0 delay.max=100 delay.defl=50
    //% y.min=0 y.max=3 y.defl=1
    //% color=#0303c3
    export function scrollText(text: string, delay: number = 50, y: number = 1) {
        p_buffer = textbuffer
        b_buffer = textblinkbuffer
        setWriteFrame(7)
        setDisplayFrame(7)
        text = tokenize(text)
        let len: number = measureText(text)
        for (let x = 0; x < len + 16; x++) {
            frameClear()
            _drawText(text, 16 - x, y)
            show()
            if (delay > 0) {
                control.waitMicros(delay * 1000)
            }
        }
        p_buffer = pixelbuffer
        b_buffer = pixelblinkbuffer
        setWriteFrame(0)
        setDisplayFrame(0)
    }


    /**
      * Draw a single alphanumeric character  - requires show().
      * @param char - character to display
      * @param x - column position (0-16)
      * @param y - vertical offset [0-3]
      */
    //% blockId=leds16x9_draw_char
    //% block="draw char %char at x %x y %y"
    //% y.min=0 y.max=3 y.defl=1
    //% color=#0303c3
    export function drawChar(char: string, x: number, y: number = 1): void {
        let width = _drawChar(char, x, y)
    }


    export function _drawText(text: string, x: number, y: number = 1): void {
        let offset_x: number = 0
        for (let i: number = 0; i < text.length; i++) {
            if (x + offset_x > 15) {
                return
            }
            let width = _drawChar(text.charAt(i), x + offset_x, y)
            if (i < text.length - 1) {
                for (let q = 0; q < 5; q++) {
                    framePixel(x + offset_x + width, y + q, false)
                }
            }
            offset_x += width + 1
        }
    }

    function _drawChar(char: string, x: number, y: number = 1): number {
        if (char.charCodeAt(0) > DAL.MICROBIT_FONT_ASCII_END + ARROWOFFSET) {
            setImage(images.arrowImage(char.charCodeAt(0) - DAL.MICROBIT_FONT_ASCII_END - ARROWOFFSET - 1), x, y)
            return 5;
        }
        if (char.charCodeAt(0) > DAL.MICROBIT_FONT_ASCII_END) {
            setIcon(char.charCodeAt(0) - DAL.MICROBIT_FONT_ASCII_END - 1, x, y)
            return 5;
        }
        let data: Buffer = getChar(char)
        y = Math.constrain(y, 0, 3)
        let width = charWidth(char)
        for (let row = 0; row < 5; row++) {
            if (width < 0)
                data[row] <<= 1
            for (let col = 0; col < Math.abs(width); col++) {
                framePixel(col + x, row + y, (data[row] & TWOS[4 - col]) != 0)
            }
        }
        return Math.abs(width)
    }


    /**
     * Draw text string - requires show()
     * @param text - text to show
     * @param x - column (0-16)
     * @param y - vertical offset [0-3]
     */
    //% blockId=leds16x9_draw_text
    //% block="draw string %text at x %x y %y"
    //% x.min=0 x.max=16 y.min=0 y.max=3 y.defl=1
    //% color=#0303c3
    export function drawText(text: string, x: number, y: number = 1): void {
        text = tokenize(text)
        _drawText(text, x, y)
    }

    function tokenize(text: string): string {
        let result: string = ""
        let icon: string = ""
        for (let i = 0; i < text.length; i++) {
            let char: string = text.charAt(i)
            if (char == "}" && icon.length > 0) {
                let index: number = ICONS.indexOf(icon.substr(1, 6))
                icon += char
                if (index > -1) {
                    icon = String.fromCharCode(DAL.MICROBIT_FONT_ASCII_END + 1 + index)
                }
                result += icon
                icon = ""
                continue
            }
            if (char == "{" || icon.length > 0) {
                icon += char
                continue
            }
            result += char
        }
        return result
    }

    /**
     * Display an icon on scroll:bit
     * @param icon - icon to display
     * @param x - column to set (0-15)
     * @param y - row to set (086)
     */
    //% blockId=leds16x9_set_icon
    //% block="draw icon %icon at x %x y %y"
    //% icon.fieldEditor="gridpicker"
    //% icon.fieldOptions.width="400" icon.fieldOptions.columns="5"
    //% icon.fieldOptions.itemColour="black" icon.fieldOptions.tooltips="true"
    //% x.min=0 x.max=15 y.min=0 y.max=8
    //% color=#0303c3
    export function setIcon(icon: IconNames, x: number, y: number): void {
        let image: Image = images.iconImage(icon)
        setImage(image, x, y)
    }

    /**
     * Display an image on scroll:bit
     * @param image - image to display
     * @param x - column to set (0-15)
     * @param y - row to set (0-8)
     */
    //% blockId=leds16x9_set_image
    //% block="draw 5x5 image %image at |x %x |y %y"
    //% x.min=0 x.max=15 y.min=0 y.max=8
    //% color=#0303c3
    export function setImage(image: Image, x: number, y: number): void {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < image.width(); col++) {
                framePixel(x + col, y + row, image.pixel(col, row))
            }
        }
    }
    /**
     * Display an full 17x7 image on scroll:bit
     * @param image - image to display
     */
    //% blockId=leds16x9_set_full_image
    //% block="draw 17x7 image %image"
    //% color=#0303c3
    export function setFullImage(image: Image): void {
        for (let buf = 0; buf < 18; buf++) {
            b_buffer[buf] = 0
            p_buffer[buf] = 0
            for (let col = 0; col < 7; col++) {
                let x = (buf > 8) ? col + 8 : col
                let y = (buf > 8) ? buf - 9 : buf
                if (image.pixel(x, y)) {
                    p_buffer[buf] |= TWOS[x]
                }
            }
        }
    }


    //% block="world: create %x cols and %y rows"
    //% x.min=16 y.min=9
    //% advanced=true color=#4703c3
    export function worldCreate(x: number, y: number): void {
        worldWidth = x
        worldHeight = y
        useWorld = true
        worldRowMult = (x + 7) >> 3
        worldSize = worldHeight * worldRowMult
        if (worldbuffer.length !== 0) {
            let tempbuf = pins.createBuffer(worldSize)
            worldbuffer = tempbuf
        } else {
            worldbuffer = pins.createBuffer(worldSize)
        }
        worldbuffer.fill(0)
        wfMaxX = worldWidth - 16
        wfMaxY = worldHeight - 9
        worldFrameX = 0
        worldFrameY = 0
    }

    //% block="world: delete"
    //% blockId=leds16x9_delete_world
    //% advanced=true color=#4703c3
    export function worldDelete() {
        useWorld = false
        if (worldbuffer.length !== 0) {
            worldbuffer.fill(0)
        }
        worldSize = 0; worldWidth = 0; worldHeight = 0;
        wfMaxX = 0; wfMaxY = 0;
        frameClear()
        show()
    }
    //% block="world: clear"
    //% blockId=leds16x9_clear_world
    //% advanced=true color=#4703c3
    export function worldClear() {
        if (worldbuffer.length !== 0) {
            worldbuffer.fill(0)
        }
    }


    //% block="world: pixel x %x y %y $state"
    //% state.shadow="toggleOnOff" state.defl=true x.min=0 y.min=0
    //% advanced=true color=#4703c3
    export function worldPixel(x: number, y: number, state: boolean): void {
        if ((x | y) < 0) { return }
        if (x >= worldWidth) { return }
        if (y >= worldHeight) { return }
        let x_low = x & 7
        let x_high = x >> 3
        let offset = worldRowMult * y + x_high
        let bitmask = TWOS[x_low]
        if (state) {
            worldbuffer[offset] |= bitmask
        } else {
            worldbuffer[offset] &= ~bitmask
        }
    }

    /**
      * Plot a shape between two points (x0,y0) to (x1,y1)
      * on the world plane
      * @param plot - plot type: 0 = line, 1 = box, 2 = rectangle
      * @param x0 - column
      * @param y0 - row
      * @param x1 - column
      * @param y1 - row
      */
    //% blockId=leds16x9_world_plot
    //% block="world: %plot=plot_conv from x %x0 y %y0 to x %x1 y %y1 $state"
    //% state.shadow="toggleOnOff" state.defl=true
    //% inlineInputMode=inline
    //% advanced=true color=#4703c3
    export function worldPlot(plot: Plots, x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        switch (plot) {
            case 0: { plotWorldLine(x0, y0, x1, y1, state); break }
            case 1: { plotWorldBox(x0, y0, x1, y1, state); break }
            case 2: { plotWorldRect(x0, y0, x1, y1, state); break }
        }
    }
    /**
     * Define the position of the window on the world view
     * @param x - column
     * @param y - row
     */
    //% blockId=leds16x9_world_position_frame
    //% block="world: positon frame at x %x y %y"
    //% advanced=true color=#4703c3
    export function worldPositionFrame(x: number, y: number) {
        worldFrameX = Math.constrain(x, 0, wfMaxX)
        worldFrameY = Math.constrain(y, 0, wfMaxY)

    }
    /**
     * Move the window on the world view
     * @param direction - dup/right/left/down [0-3]
     */
    //% blockId=leds16x9_world_move_frame
    //% block="world: move frame %direction=dir_conv"
    //% advanced=true color=#4703c3
    export function worldMoveFrame(dir: number) {
        switch (dir) {
            case 0: { if (worldFrameY > 0) { worldFrameY -= 1 }; break }
            case 1: { if (worldFrameX < wfMaxX) { worldFrameX += 1 }; break }
            case 2: { if (worldFrameY < wfMaxY) { worldFrameY += 1 }; break }
            case 3: { if (worldFrameX > 0) { worldFrameX -= 1 }; break }
        }
    }

    /**
     * Returns boolean - is pixel at (x,y) set in the world field?
     * Queries the pixel buffer, NOT the LED display
     * @param x - column (0,17)
     * @param y - row (0,7)
     */
    //% blockID=leds16x9_world_is_pixel
    //% block="world: is pixel at x %x y %y"
    //% inlineInputMode=inline
    //% advanced=true color=#4703c3
    export function worldIsPixel(x: number, y: number): boolean {
        if ((x | y) < 0) { return false }
        if (x >= worldWidth) { return false }
        if (y >= worldHeight) { return false }
        let offset = worldRowMult * y + (x >> 3)
        return (worldbuffer[offset] & TWOS[x & 7]) != 0
    }

    /**
     * Returns boolean - is pixel at (x,y) set in the world field?
     * Queries the pixel buffer, NOT the LED display
     * @param x - column (0,17)
     * @param y - row (0,7)
     */
    //% blockID=leds16x9_world_is_pixel_relative
    //% block="world: is pixel at frame co-ords x %x y %y"
    //% inlineInputMode=inline
    //% advanced=true color=#4703c3
    export function worldIsPixelRelative(x: number, y: number): boolean {
        return worldIsPixel(x + worldFrameX, y + worldFrameY)
    }



    //% blockId=leds16x9_get_world_frame_x
    //% block="world: get frame position x"
    //% advanced=true color=#4703c3
    export function worldFramePosX(): number {
        return worldFrameX
    }
    //% blockId=leds16x9_get_world_frame_y
    //% block="world: get frame position y"
    //% advanced=true color=#4703c3
    export function worldFramePosY(): number {
        return worldFrameY
    }

    //% blockId=leds16x9_world_frame_max_x
    //% block="world: frame position max x"
    //% advanced=true color=#4703c3
    export function worldFrameMaxX(): number {
        return wfMaxX
    }
    //% blockId=leds16x9_world_frame_max_y
    //% block="world: frame position max y"
    //% advanced=true color=#4703c3
    export function worldFrameMaxY(): number {
        return wfMaxY
    }

    //% blockID=leds16x9_mask_row
    //% block="mask row %x : AND %maskand OR %maskor"
    //% advanced=true color=#070373
    export function maskRow(y: number, maskand: number, maskor: number): void {
        if (y < 0) { return }
        if (y > VIRTUAL_HEIGHT) { return }
        y <<= 1
        p_buffer[y] = (p_buffer[y] & maskand) | maskor
        p_buffer[y + 1] = 0xff & (p_buffer[y + 1] & (maskand >> 8)) | (maskor >> 8)
    }


    /**
    * Set blink mode and blink frequency.
    * See blinkPixel() & setAllBlinks().
    * Note: pixel blink buffer is not cleared
    * @param mode - On/Off
    * @param freq - blink frequency [0-7]
    */
    //% block="set blink mode $mode| freq %freqe"
    //% mode.shadow="toggleOnOff" mode.defl=false
    //% advanced=true
    export function setBlinkMode(mode: boolean, freq: number = 0): void {
        setCmdRegMode()
        writeByte(DISP_REG, (mode ? 8 : 0) + freq)
        useBlink = mode
        setWriteFrame(currentWriteFrame)
    }

    /**
     * Set all pixel blinks on/off.
     * Sets all blink buffer bits to '1' and updates display.
     * @param blink - On/Off
     */
    //% block="set all blinks $blink"
    //% blink.shadow="toggleOnOff" blink.defl=false
    //% advanced=true
    export function setAllBlinks(blink: boolean): void {
        b_buffer.fill(blink ? 0x7F : 0x00)
        let temp = pins.createBuffer(b_buffer.length + 1);
        temp[0] = REG_BLINK;
        for (let i = 0; i < b_buffer.length; i++) {
            temp[i + 1] = b_buffer[i];
        }
        pins.i2cWriteBuffer(I2C_ADDR, temp, false)
    }


    /**
     * Set brightness of the scroll:bit display
     * @param level - brightness to set (0-255)
     */
    //% blockId=leds16x9_set_all_bright
    //% block="set all brightness to %level"
    //% level.min=0 brightness.max=255 brightness.defl=128
    //% advanced=true
    export function setAllBrightness(level: number = 128): void {
        brightness.fill(Math.clamp(0, 255, level))
        let temp = pins.createBuffer(brightness.length + 1);
        temp[0] = REG_BRIGHT;
        for (let i = 0; i < brightness.length; i++) {
            temp[i + 1] = brightness[i];
        }
        pins.i2cWriteBuffer(I2C_ADDR, temp, false)
    }

    /**
     * Update one column of pixels on LED matrix.
     * Useful for speed if full-screen show() is not requied
     * @param y - row (0-8)
     */
    //% blockId=leds16x9_frame_show_column
    //% block="show scroll:bit column %x"
    //% advanced=true
    export function frameShowRow(y: number): void {
        if (useWorld) { return }
        if (y < 0) { return }
        if (y > VIRTUAL_HEIGHT) { return }
        writeRow(y)
        if (useBlink) {
            writeRowBlink(y)
        }
    }
    /**
     * Set the frame to be displayed on the scroll:bit.
     * Scroll:bit returned to frame write mode aftewards.
     * @param frame - frame number [0-7]
    */
    //% blockId=leds16x9_display_frame
    //% block="set display frame |%frame"
    //% frame.defl=0
    //% advanced=true
    export function setDisplayFrame(frame: number): void {
        currentDisplayFrame = frame
        setCmdRegMode()
        writeByte(REG_FRAME, frame)
        setWriteFrame(currentWriteFrame)
    }

    /**
     * Set the frame to be written to on the scroll:bit
     * @param frame - frame number [0-7]
     */
    //% blockId=leds16x9_write_frame
    //% block="set write frame |%frame"
    //% frame.defl=0
    //% advanced=true
    export function setWriteFrame(frame: number): void {
        currentWriteFrame = frame
        writeByte(CMD_REG, frame)
    }

    /**
     * Measure text, returns a length in pixels
     * @param text - text string to measure
     */
    //% blockId=leds16x9_measure_text
    //% block="get length of %text in pixels"
    //% advanced=true color=#554444
    export function measureText(text: string): number {
        let len: number = 0
        for (let i: number = 0; i < text.length; i++) {
            len += Math.abs(charWidth(text.charAt(i)) + 1)
        }
        return len
    }

    /* switch to Function Register mode */
    function setCmdRegMode(): void {
        writeByte(CMD_REG, BANK_CONFIG)
    }

    /* switch to Picture Display Mode */
    function setDisplayMode(mode: number): void {
        setCmdRegMode()
        writeByte(REG_MODE, mode)
    }

    /* set audiosync mode */
    function setAudioSyncMode(mode: number): void {
        setCmdRegMode()
        writeByte(REG_MODE, mode)
    }

    /**
     */
    //% block="make image"
    //% advanced=true
    //% imageLiteral=1
    //% imageLiteralColumns=17
    //% imageLiteralRows=7
    //% imageLiteralScale=0.6
    //% shim=images::createImage
    export function myImage(i: string): Image {
        const im = <Image><any>i;
        return im
    }

    /**
     * Setup myscroll:bit. Is called automatically.
     * Default is no blink mode, brightness=128, write/diplay frame 0
     */
    export function reset(): void {
        setCmdRegMode() /* switch to f-reg mode and reset*/
        control.waitMicros(1000)
        writeByte(REG_SHUTDOWN, 0)
        control.waitMicros(1000)
        writeByte(REG_SHUTDOWN, 1)
        control.waitMicros(1000)
        setDisplayMode(PIC_MODE) /* set to pic mode */
        setAudioSyncMode(0);
        setBlinkMode(true, 1)
        setWriteFrame(0)
        setDisplayFrame(0)
        frameClear()
        worldDelete()
        for (let frame = 7; frame >= 0; frame--) {
            setWriteFrame(frame)
            /* no longer in CMD Reg Mode */
            setAllBrightness(200) /* fill brightness to 255 */
            show()
        }
        setBlinkMode(false, 0)
    }

    function getChar(character: string): Buffer {
        return getFontData(character.charCodeAt(0))
    }

    function charWidth(character: string): number {
        let charcode: number = character.charCodeAt(0)
        if (charcode > DAL.MICROBIT_FONT_ASCII_END) {
            return 5
        }
        return getCharWidth(charcode)
    }

    function writeByte(register: number, value: number): void {
        let temp = pins.createBuffer(2);
        temp[0] = register;
        temp[1] = value;
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }

    //% shim=leds16x9::getFontDataByte
    function getFontDataByte(index: number): number {
        return 0
    }

    //% shim=leds16x9::getFontData
    function getFontData(index: number): Buffer {
        return pins.createBuffer(5)
    }

    //% shim=leds16x9::getCharWidth
    function getCharWidth(char: number): number {
        return 5
    }


    function writeRowData(row: number, value: number, register: number = 0): void {
        let temp = pins.createBuffer(3);
        temp[0] = register;
        row <<= 1
        temp[1] = value & 0x00ff
        temp[2] = (value & 0xff00) >> 8
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }

    function writeRow(row: number, register: number = 0): void {
        let temp = pins.createBuffer(3);
        temp[0] = register;
        row <<= 1
        temp[1] = p_buffer[row]
        temp[2] = p_buffer[row + 1]
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }
    function writeRowBlink(row: number, ): void {
        let temp = pins.createBuffer(3)
        temp[0] = 18
        row <<= 1
        temp[1] = b_buffer[row]
        temp[2] = b_buffer[row + 1]
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }

    function andRowBytes(row: number, andlow: number, andhigh: number): void {
        if (row < 0) { return }
        if (row > 8) { return }
        let r = row << 1
        p_buffer[r] = p_buffer[r] & andlow
        p_buffer[r + 1] = p_buffer[r + 1] & andhigh
    }
    function orRowBytes(row: number, orlow: number, orhigh: number): void {
        if (row < 0) { return }
        if (row > 8) { return }
        let r = row << 1
        p_buffer[r] = p_buffer[r] | orlow
        p_buffer[r + 1] = p_buffer[r + 1] | orhigh
    }
    function plotLine(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
        let x = x0, y = y0
        if (dx > dy) {
            if (x0 > x1) { x = x1; y = y1; x1 = x0; y1 = y0 }
            if (dy == 0) {
                if (x < 0) x = 0
                if (x1 > 15) x1 = 15
                let bitmaskF0 = FILL_X[x + 1] ^ FILL_X[x1 + 2]
                let bitmaskF1 = FILL_B[x + 1] ^ FILL_B[x1 + 2]
                if (state) {
                    orRowBytes(y, bitmaskF0, bitmaskF1)
                } else {
                    andRowBytes(y, ~bitmaskF0, ~bitmaskF1)
                }
            } else {
                let yc = (y1 > y) ? 1 : -1
                let mid = (x + x1) >> 1
                let a = dy << 1, p = a - dx, b = p - dx
                framePixel(x, y, state)
                while (x < x1) {
                    if ((p < 0) || ((p == 0) && (x >= mid))) { p += a }
                    else { p = p + b; y += yc }
                    x++; framePixel(x, y, state)
                }
            }
        } else {
            if (y0 > y1) { x = x1; y = y1; x1 = x0; y1 = y0 }
            let xc = (x1 > x) ? 1 : -1
            let mid = (y + y1) >> 1
            let a = dx << 1, p = a - dy, b = p - dy
            framePixel(x, y, state)
            while (y < y1) {
                if ((p < 0) || ((p == 0) && (y >= mid))) { p += a }
                else { p = p + b; x += xc }
                y++; framePixel(x, y, state)
            }
        }
    }
    function plotWorldLine(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
        let xa = x0, xb = x1, ya = y0, yb = y1
        if (dx > dy) {
            if (x0 > x1) { xa = x1; ya = y1; xb = x0; yb = y0 }
            let yc = (yb > ya) ? 1 : -1
            let mid = (x0 + x1) >> 1
            let a = dy << 1, p = a - dx, b = p - dx
            worldPixel(xa, ya, state)
            while (xa < xb) {
                if ((p < 0) || ((p == 0) && (xa >= mid))) { p = p + a }
                else { p = p + b; ya = ya + yc }
                xa += 1; worldPixel(xa, ya, state)
            }
        } else {
            if (y0 > y1) { xa = x1; ya = y1; xb = x0; yb = y0 }
            let xc = (xb > xa) ? 1 : -1
            let mid = (y0 + y1) >> 1
            let a = dx << 1, p = a - dy, b = p - dy
            worldPixel(xa, ya, state)
            while (ya < yb) {
                if ((p < 0) || ((p == 0) && (ya >= mid))) { p = p + a }
                else { p = p + b; xa = xa + xc }
                ya += 1; worldPixel(xa, ya, state)
            }
        }
    }
    function plotBox(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let x = x0, y = y0
        if (x1 < x0) { x = x1; x1 = x0 }
        if (y1 < y0) { y = y1; y1 = y0 }
        if ((y1 | x1) < 0) { return }
        if (x < 0) x = 0
        if (x1 > 15) x1 = 15
        let bitmaskF0 = FILL_X[x + 1] ^ FILL_X[x1 + 2]
        let bitmaskF1 = FILL_B[x + 1] ^ FILL_B[x1 + 2]
        for (; y <= y1; y++) {
            if (state) {
                orRowBytes(y, bitmaskF0, bitmaskF1)
            } else {
                andRowBytes(y, ~bitmaskF0, ~bitmaskF1)
            }
        }
    }
    function plotRect(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let x = x0, y = y0
        if (x1 < x0) { x = x1; x1 = x0 }
        if (y1 < y0) { y = y1; y1 = y0 }
        if ((y1 | x1) < 0) { return }
        if (x < 0) x = -1
        if (x1 > 15) x1 = 16
        x++
        let bitmaskF0 = FILL_X[x] ^ FILL_X[x1 + 2]
        let bitmaskF1 = FILL_B[x] ^ FILL_B[x1 + 2]
        let bitmaskE0 = FILL_R[x] | FILL_R[x1 + 1]
        let bitmaskE1 = FILL_S[x] | FILL_S[x1 + 1]
        if (state) {
            orRowBytes(y, bitmaskF0, bitmaskF1)
            orRowBytes(y1, bitmaskF0, bitmaskF1)
            y++
            for (; y < y1; y++) { orRowBytes(y, bitmaskE0, bitmaskE1) }
        } else {
            andRowBytes(y, ~bitmaskF0, ~bitmaskF1)
            andRowBytes(y1, ~bitmaskF0, ~bitmaskF1)
            y++
            for (; y < y1; y++) { andRowBytes(y, ~bitmaskE0, ~bitmaskE1) }
        }
    }
    function plotWorldBox(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let yy = y1
        if (y1 < y0) { yy = y0; y0 = y1 }
        for (; y0 <= yy; y0++) {
            plotWorldLine(x0, y0, x1, y0, state)
        }
    }
    function plotWorldRect(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        plotWorldLine(x0, y0, x1, y0, true)
        plotWorldLine(x0, y1, x1, y1, true)
        plotWorldLine(x0, y0, x0, y1, true)
        plotWorldLine(x1, y0, x1, y1, true)
    }
    function showWorld() {
        let temp = pins.createBuffer(19)
        temp[0] = 0
        let x_low = worldFrameX & 7
        let x_high = worldFrameX >> 3
        let offset = x_high + worldRowMult * worldFrameY
        for (let i = 0; i < 17; i = i + 2, offset = offset + worldRowMult) {
            if (x_low == 0) {
                temp[i + 1] = worldbuffer[offset] | p_buffer[i]
                temp[i + 2] = worldbuffer[offset + 1] | p_buffer[i + 1]
            } else {
                let a = worldbuffer[offset] >> x_low
                let b = worldbuffer[offset + 1] << (8 - x_low)
                temp[i + 1] = (p_buffer[i] | a | b) & 0xFF
                a = worldbuffer[offset + 1] >> x_low
                b = worldbuffer[offset + 2] << (8 - x_low)
                temp[i + 2] = (p_buffer[i + 1] | a | b) & 0xFF
            }
        }
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
        if (useBlink) {
            let temp2 = pins.createBuffer(19)
            temp2[0] = 18
            for (let x = 0; x < 18; x++) {
                temp2[x + 1] = b_buffer[x]
            }
            pins.i2cWriteBuffer(I2C_ADDR, temp2, false);
        }
    }


    function showFrame() {
        if (!useBlink) {
            let temp = pins.createBuffer(19)
            temp[0] = 0
            for (let x = 0; x < 18; x++) {
                temp[x + 1] = p_buffer[x]
            }
            pins.i2cWriteBuffer(I2C_ADDR, temp, false);
        } else {
            let temp = pins.createBuffer(37)
            temp[0] = 0
            for (let x = 0; x < 18; x++) {
                temp[x + 1] = p_buffer[x]
                temp[x + 19] = b_buffer[x]
            }
            pins.i2cWriteBuffer(I2C_ADDR, temp, false);
        }
    }
}
leds16x9.reset();
