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
//% block="Leds9x16:Bit"
//% blockGap=8
namespace leds9x16 {

    const SCREEN_WIDTH = 16
    const SCREEN_HEIGHT = 6
    const VIRTUAL_WIDTH = 17
    const VIRTUAL_HEIGHT = 7
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
    const COL_MAP = hex`100E0C0A080604020001030507090B0D0F11`
    const COL_ORDER = hex`0809070A060B050C040D030E020F01100011`
    const TWOS = hex`0102040810204080`
    const BOX_FILL = hex`0103070f1f3f7fff`
    const RECT_FILL = hex`0103050911214181`
    const REVERSE = hex`0040206010503070084828681858387804442464145434740c4c2c6c1c5c3c7c02422262125232720a4a2a6a1a5a3a7a06462666165636760e4e2e6e1e5e3e7e0141216111513171094929691959397905452565155535750d4d2d6d1d5d3d7d03432363135333730b4b2b6b1b5b3b7b07472767175737770f4f2f6f1f5f3f7f80C0A0E090D0B0F088C828E89858B8F884C4A4E494D4B4F48cCcAcEc9cDcBcFc82C2A2E292D2B2F28aCaAaEa9aDaBaFa86C6A6E696D6B6F68eCeAeEe9eDeBeFe81C1A1E191D1B1F189C9A9E999D9B9F985C5A5E595D5B5F58dCdAdEd9dDdBdFd83C3A3E393D3B3F38bCbAbEb9bDbBbFb87C7A7E797D7B7F78fCfAfEf9fDfBfFf`

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
    let useWorldOverlay: boolean = false
    let worldFrameX: number = 0
    let worldFrameY: number = 0
    let worldExtent: number = 0
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
     * @param x - column to set (0,17)
     * @param y - row to set (0,7)
     * @param state - on/off state
     */
    //% block="pixel at x %x y %y $state"
    //% state.shadow="toggleOnOff" state.defl=true
    //% inlineInputMode=inline
    export function framePixel(x: number, y: number, state: boolean): void {
        if (x > VIRTUAL_WIDTH) { return }
        if (y > VIRTUAL_HEIGHT) { return }
        if ((x | y) < 0) { return }
        if (state) {
            p_buffer[x] = p_buffer[x] | TWOS[y]
        } else {
            let bitmask = ~TWOS[y]
            p_buffer[x] = p_buffer[x] & bitmask
            b_buffer[x] = b_buffer[x] & bitmask
        }
    }


    /**
      * Set or clear blink for pixel (x,y).
      * LED matrix is not updated until a show() or showColumn()
      * Requires blink mode - see setBlinkMode()
      * @param x - column to set (0,17)
      * @param y - row to set (0,7)
      * @param blink - on/off blink state
      */
    //% blockID=leds9x16_frame_blink
    //% block="pixel at x %x y %y set blink $blink"
    //% blink.shadow="toggleOnOff" blink.defl=false
    //% inlineInputMode=inline
    export function frameBlink(x: number, y: number, blink: boolean): void {
        if (x > VIRTUAL_WIDTH) { return }
        if (y > VIRTUAL_HEIGHT) { return }
        if ((x | y) < 0) { return }
        if (blink) {
            b_buffer[x] = b_buffer[x] | TWOS[y]
        } else {
            b_buffer[x] = b_buffer[x] & ~TWOS[y]
        }
    }

    /**
      * Plot line/box/rectangle between points (x0,y0) (x1,y1)
      * @param plot - plot type: 0 = line, 1 = box, 2 = rectangle
      * @param x0 - column  (0,17)
      * @param y0 - row (0,7)
      * @param x1 - column  (0,17)
      * @param y1 - row (0,7)
      * @param state - on/off state (draw/undraw)
      */
    //% blockId=leds9x16_frame_plot
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
    //% blockId=leds9x16_frame_scroll
    //% block="scroll scroll:bit %direction=dir_conv"
    export function frameScroll(direction: number): void {
        if (direction & 1) {
            let dir = 1 - (direction & 2)
            p_buffer.shift(dir)
            if (useBlink) {
                b_buffer.shift(dir)
            }
        } else {
            if (direction & 2) {
                for (let i = 0; i < 18; i++) { p_buffer[i] <<= 1 }
                if (useBlink) {
                    for (let i = 0; i < 18; i++) { b_buffer[i] <<= 1 }
                }
            } else {
                for (let i = 0; i < 18; i++) { p_buffer[i] >>= 1 }
                if (useBlink) {
                    for (let i = 0; i < 18; i++) { b_buffer[i] >>= 1 }
                }
            }
        }
    }

    /**
     * Clear pixel and blink buffers.
     */
    //% blockId=leds9x16_frame_clear
    //% block="clear scroll:bit"
    export function frameClear(): void {
        p_buffer.fill(0)
        b_buffer.fill(0)
    }
    /**
     * Transfer pixel (and blink) buffers to LED display.
     * If in World View, displays the World with or without frame overlay.
     */
    //% blockId=leds9x16_show
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
    //% blockID=leds9x16_is_pixel
    //% block="is pixel set at x %x y %y"
    //% x.min=0 y.min=0
    //% inlineInputMode=inline
    export function frameIsPixel(x: number, y: number): boolean {
        if (y > VIRTUAL_HEIGHT) { return false }
        if (x > VIRTUAL_WIDTH) { return false }
        if ((x | y) < 0) { return false }
        return ((p_buffer[x] & TWOS[y]) != 0)
    }

    /**
     * Return the maximum x coordinate
     */
    //% blockId=leds9x16_frame_max_x
    //% block="max X of scroll:bit"
    export function frameWidth(): number {
        return SCREEN_WIDTH
    }
    /**
      * Return the maximum y coordinate
      */
    //% blockId=leds9x16_max_y
    //% block="max Y of scroll:bit"
    //% blockGap=40
    export function frameHeight(): number {
        return SCREEN_HEIGHT
    }



    /**
     * Scroll text across LED matrix - does not require show()
     * Preseves and restores existing display contents.
     * @param text - text to scroll
     * @param delay - scroll delay in ms
     * @param y - vertical offset [0-2]
     */
    //% blockId=leds9x16_scroll_text 
    //% block="scroll string %text delay (ms) %delay y %y"
    //% delay.min=0 delay.max=100 delay.defl=50
    //% y.min=0 y.max=2 y.defl=1
    //% color=#0303c3
    export function scrollText(text: string, delay: number = 50, y: number = 1) {
        p_buffer = textbuffer
        b_buffer = textblinkbuffer
        setWriteFrame(7)
        setDisplayFrame(7)
        text = tokenize(text)
        let len: number = measureText(text)
        for (let x = 0; x < len + SCREEN_WIDTH; x++) {
            frameClear()
            _drawText(text, SCREEN_WIDTH - x, y)
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
      * @param y - vertical offset [0-2]
      */
    //% blockId=leds9x16_draw_char
    //% block="draw char %char at x %x y %y"
    //% y.min=0 y.max=2 y.defl=1
    //% color=#0303c3
    export function drawChar(char: string, x: number, y: number = 1): void {
        let width = _drawChar(char, x, y)
    }


    export function _drawText(text: string, x: number, y: number = 1): void {
        let offset_x: number = 0
        for (let i: number = 0; i < text.length; i++) {
            if (x + offset_x > SCREEN_WIDTH) {
                return
            }
            let width = _drawChar(text.charAt(i), x + offset_x, y)
            if (i < text.length - 1) {
                p_buffer[x + offset_x + width] = 0
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
        y = Math.constrain(y, 0, 2)
        let charWidth = 0
        let mask = 0x10
        let letter: boolean = false
        for (let bit_col = 0; bit_col < 5; bit_col++) {
            let bits = 0x00
            bits |= ((data[4] & mask) != 0) ? 1 : 0; bits <<= 1
            bits |= ((data[3] & mask) != 0) ? 1 : 0; bits <<= 1
            bits |= ((data[2] & mask) != 0) ? 1 : 0; bits <<= 1
            bits |= ((data[1] & mask) != 0) ? 1 : 0; bits <<= 1
            bits |= ((data[0] & mask) != 0) ? 1 : 0; bits <<= y
            mask >>= 1
            letter = letter || (bits > 0)
            if ((bits != 0) || ((bit_col > 1) && !(letter))) {
                let column = x + charWidth
                if ((column <= SCREEN_WIDTH) && (column >= 0)) {
                    p_buffer[column] = bits
                    b_buffer[column] = 0
                }
                charWidth += 1
            }
        }
        return charWidth
    }


    /**
     * Draw text string - requires show()
     * @param text - text to show
     * @param x - column (0-16)
     * @param y - vertical offset [0-2]
     */
    //% blockId=leds9x16_draw_text
    //% block="draw string %text at x %x y %y"
    //% x.min=0 x.max=16 y.min=0 y.max=2 y.defl=1
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
     * @param x - column to set (0-16)
     * @param y - row to set (0-6)
     */
    //% blockId=leds9x16_set_icon
    //% block="draw icon %icon at x %x y %y"
    //% icon.fieldEditor="gridpicker"
    //% icon.fieldOptions.width="400" icon.fieldOptions.columns="5"
    //% icon.fieldOptions.itemColour="black" icon.fieldOptions.tooltips="true"
    //% x.min=0 x.max=16 y.min=0 y.max=6
    //% color=#0303c3
    export function setIcon(icon: IconNames, x: number, y: number): void {
        let image: Image = images.iconImage(icon)
        setImage(image, x, y)
    }

    /**
     * Display an image on scroll:bit
     * @param image - image to display
     * @param x - column to set (0-16)
     * @param y - row to set (0-6)
     */
    //% blockId=leds9x16_set_image
    //% block="draw 5x5 image %image at |x %x |y %y"
    //% x.min=0 x.max=16 y.min=0 y.max=6
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
    //% blockId=leds9x16_set_full_image
    //% block="draw 17x7 image %image"
    //% color=#0303c3
    export function setFullImage(image: Image): void {
        for (let col = 0; col < 17; col++) {
            let bits = 0x00
            for (let row = 0; row < 7; row++) {
                if (image.pixel(col, row)) {
                    bits |= 0x80
                }
                bits >>= 1
            }
            p_buffer[col] = bits
            b_buffer[col] = 0
        }
    }


    //% block="world: create %x cols and %y rows | overlay $overlay"
    //% overlay.shadow="toggleOnOff"
    //% overlay.defl=false x.min=0 y.min=0
    //% advanced=true color=#4703c3
    export function worldCreate(x: number, y: number, overlay: boolean = false): void {
        worldWidth = x
        worldHeight = y
        useWorld = true
        let byte_y = y >> 3
        worldExtent = worldWidth * byte_y + x
        if ((y & 0x07) != 0) { byte_y += 1 }
        if (worldbuffer.length !== 0) {
            let tempbuf = pins.createBuffer(x * byte_y)
            worldbuffer = tempbuf
        } else {
            worldbuffer = pins.createBuffer(x * byte_y)
        }
        wfMaxX = worldWidth - VIRTUAL_WIDTH
        wfMaxY = worldHeight - VIRTUAL_HEIGHT
        worldFrameX = 0
        worldFrameY = 0
        useWorldOverlay = overlay
    }

    //% block="world: delete"
    //% blockId=leds9x16_delete_world
    //% advanced=true color=#4703c3
    export function worldDelete() {
        useWorld = false
        if (worldbuffer.length !== 0) {
            worldbuffer.fill(0)
        }
        worldExtent = 0; worldWidth = 0; worldHeight = 0;
        wfMaxX = 0; wfMaxY = 0;
        frameClear()
        show()
    }


    //% block="world: pixel x %x y %y $state"
    //% state.shadow="toggleOnOff" state.defl=true x.min=0 y.min=0
    //% advanced=true color=#4703c3
    export function worldPixel(x: number, y: number, state: boolean): void {
        if ((x | y) < 0) { return }
        if (x >= worldWidth) { return }
        if (y >= worldHeight) { return }
        let y_low = y & 7
        let y_high = y >> 3
        let offset = worldWidth * y_high + x
        let bitmask = TWOS[y_low]
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
    //% blockId=leds9x16_world_plot
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
    //% blockId=leds9x16_world_position_frame
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
    //% blockId=leds9x16_world_move_frame
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
    //% blockID=leds9x16_world_is_pixel
    //% block="world: is pixel at x %x y %y"
    //% inlineInputMode=inline
    //% advanced=true color=#4703c3
    export function worldIsPixel(x: number, y: number): boolean {
        if (y >= worldWidth) { return false }
        if (x >= worldHeight) { return false }
        if ((x | y) < 0) { return false }
        let y_low = y & 7
        let y_high = y >> 3
        let offset = worldWidth * y_high + x
        return (worldbuffer[offset] & TWOS[y_low]) != 0
    }

    /**
     * Returns boolean - is pixel at (x,y) set in the world field?
     * Queries the pixel buffer, NOT the LED display
     * @param x - column (0,17)
     * @param y - row (0,7)
     */
    //% blockID=leds9x16_world_is_pixel_relative
    //% block="world: is pixel at frame co-ords x %x y %y"
    //% inlineInputMode=inline
    //% advanced=true color=#4703c3
    export function worldIsPixelRelative(x: number, y: number): boolean {
        return worldIsPixel(x + worldFrameX, y + worldFrameY)
    }



    //% blockId=leds9x16_get_world_frame_x
    //% block="world: get frame position x"
    //% advanced=true color=#4703c3
    export function worldFramePosX(): number {
        return worldFrameX
    }
    //% blockId=leds9x16_get_world_frame_y
    //% block="world: get frame position y"
    //% advanced=true color=#4703c3
    export function worldFramePosY(): number {
        return worldFrameY
    }

    //% blockId=leds9x16_world_frame_max_x
    //% block="world: frame position max x"
    //% advanced=true color=#4703c3
    export function worldFrameMaxX(): number {
        return wfMaxX
    }
    //% blockId=leds9x16_world_frame_max_y
    //% block="world: frame position max y"
    //% advanced=true color=#4703c3
    export function worldFrameMaxY(): number {
        return wfMaxY
    }

    //% blockID=leds9x16_maskcolumn
    //% block="mask column %x : AND %maskand OR %maskor"
    //% advanced=true color=#070373
    export function maskColumn(x: number, maskand: number, maskor: number): void {
        if (x < 0) { return }
        if (x > VIRTUAL_WIDTH) { return }
        p_buffer[x] = (p_buffer[x] & maskand) | maskor
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
    //% blockId=leds9x16_set_all_bright
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
     * @param x - column (0-17)
     */
    //% blockId=leds9x16_frame_show_column
    //% block="show scroll:bit column %x"
    //% advanced=true
    export function frameShowColumn(x: number): void {
        if (useWorld) { return }
        if (x < 0) { return }
        if (x > VIRTUAL_WIDTH) { return }
        writeColumnByte(x, p_buffer[x])
        if (useBlink) {
            writeColumnByte(x, b_buffer[x], 18)
        }
    }
    /**
     * Set the frame to be displayed on the scroll:bit.
     * Scroll:bit returned to frame write mode aftewards.
     * @param frame - frame number [0-7]
    */
    //% blockId=leds9x16_display_frame
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
    //% blockId=leds9x16_write_frame
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
    //% blockId=leds9x16_measure_text
    //% block="get length of %text in pixels"
    //% advanced=true color=#554444
    export function measureText(text: string): number {
        let len: number = 0
        for (let i: number = 0; i < text.length; i++) {
            len += charWidth(text.charAt(i)) + 1
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

    //% shim=leds9x16::getFontDataByte
    function getFontDataByte(index: number): number {
        return 0
    }

    //% shim=leds9x16::getFontData
    function getFontData(index: number): Buffer {
        return pins.createBuffer(5)
    }

    //% shim=leds9x16::getCharWidth
    function getCharWidth(char: number): number {
        return 5
    }


    function writeColumnByte(col: number, value: number, register: number = 0): void {
        let temp = pins.createBuffer(2);
        temp[0] = COL_MAP[col] + register;
        if (col > 8) {
            temp[1] = value;
        } else {
            temp[1] = REVERSE[value]
        }
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }
    function plotLine(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
        let x = x0, y = y0
        if (dx > dy) {
            if (x0 > x1) { x = x1; y = y1; x1 = x0; y1 = y0 }
            let yc = (y1 > y) ? 1 : -1
            let mid = (x + x1) >> 1
            let a = dy << 1, p = a - dx, b = p - dx
            framePixel(x, y, state)
            while (x < x1) {
                if ((p < 0) || ((p == 0) && (x >= mid))) { p += a }
                else { p = p + b; y += yc }
                x++; framePixel(x, y, state)
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
            worldPixel(xa, ya, true)
            while (ya < yb) {
                if ((p < 0) || ((p == 0) && (ya >= mid))) { p = p + a }
                else { p = p + b; xa = xa + xc }
                ya += 1; worldPixel(xa, ya, state)
            }
        }
    }
    function plotBox(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        if ((x0 & x1) < 0) { return }
        let bitmask = maskLineFill(y0, y1)
        let x = x0
        if (x1 < x0) { x = x1; x1 = x0 }
        for (; x <= x1; x++) {
            if ((x >= 0) && (x < VIRTUAL_WIDTH)) {
                if (state) { p_buffer[x] |= bitmask }
                else { p_buffer[x] &= ~bitmask }
            }
        }
    }
    function plotRect(x0: number, y0: number, x1: number, y1: number, state: boolean): void {
        if ((x0 & x1) < 0) { return }
        let bitmaskF = maskLineFill(y0, y1)
        let bitmaskE = maskLineEmpty(y0, y1)
        let x = x0
        if (x1 < x0) { x = x1; x1 = x0; x0 = x }
        for (; x <= x1; x++) {
            if ((x >= 0) && (x < VIRTUAL_WIDTH)) {
                if ((x == x0) || (x == x1)) {
                    if (state) { p_buffer[x] |= bitmaskF }
                    else { p_buffer[x] &= ~bitmaskF }
                } else {
                    if (state) { p_buffer[x] |= bitmaskE }
                    else { p_buffer[x] &= ~bitmaskE }
                }
            }
        }
    }
    function maskLineFill(y0: number, y1: number): number {
        if ((y0 & y1) < 0) { return 0 }
        let yh = y1, yl = y0
        if (y1 < y0) { yh = y0, yl = y1 }
        if (yh > 7) { yh = 7 }
        if ((y0 | y1) < 0) { return BOX_FILL[yh] }
        return BOX_FILL[yh - yl] << yl
    }
    function maskLineEmpty(y0: number, y1: number): number {
        if ((y0 & y1) < 0) { return 0 }
        let yh = y1, yl = y0
        if (y1 < y0) { yh = y0, yl = y1 }
        if (yh > 7) { yh = 7 }
        if ((y0 | y1) < 0) { return TWOS[yh] }
        return RECT_FILL[yh - yl] << yl
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
        let temp = pins.createBuffer(18)
        temp[0] = 0
        let y_low = worldFrameY & 7
        let y_high = worldFrameY >> 3
        let offset = worldWidth * y_high + worldFrameX
        if (useWorldOverlay) {
            for (let i = 0; i < 17; i++) {
                let mappedCol = COL_ORDER[i]
                let a = worldbuffer[mappedCol + offset] >> y_low
                let b = worldbuffer[mappedCol + offset + worldWidth] << (8 - y_low)
                let byte = (p_buffer[mappedCol] | a | b) & 0x7f
                if (mappedCol > 8) {
                    temp[i + 1] = byte
                } else {
                    temp[i + 1] = REVERSE[byte]
                }
            }
        } else {
            for (let i = 0; i < 17; i++) {
                let mappedCol = COL_ORDER[i]
                let a = worldbuffer[mappedCol + offset] >> y_low
                let b = worldbuffer[mappedCol + offset + worldWidth] << (8 - y_low)
                if (mappedCol > 8) {
                    temp[i + 1] = (a | b) & 0x7F
                } else {
                    temp[i + 1] = REVERSE[(a | b) & 0x7F]
                }
            }
        }
        pins.i2cWriteBuffer(I2C_ADDR, temp, false);
    }
    function showFrame() {
        if (!useBlink) {
            let temp = pins.createBuffer(18)
            temp[0] = 0
            for (let x = 0; x <= SCREEN_WIDTH; x++) {
                let col = COL_ORDER[x]
                if (col > 8) {
                    temp[x + 1] = p_buffer[col]
                } else {
                    temp[x + 1] = REVERSE[p_buffer[col]]
                }
            }
            pins.i2cWriteBuffer(I2C_ADDR, temp, false);
        } else {
            let temp = pins.createBuffer(37)
            temp[0] = 0
            for (let x = 0; x < 18; x++) {
                let col = COL_ORDER[x]
                if (col > 8) {
                    temp[x + 1] = p_buffer[col]
                    temp[x + 19] = b_buffer[col]
                } else {
                    temp[x + 1] = REVERSE[p_buffer[col]]
                    temp[x + 19] = REVERSE[b_buffer[col]]
                }
            }
            pins.i2cWriteBuffer(I2C_ADDR, temp, false);
        }
    }
}
leds9x16.reset();
