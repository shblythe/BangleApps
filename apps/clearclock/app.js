// Load fonts
require("Font6x12").add(Graphics);
require("Font8x16").add(Graphics);
require("FontTeletext10x18Mode7").add(Graphics);

const locale = require("locale");

var drawTimeout;
// schedule a draw for the next minute
function queueDraw() {
    if (drawTimeout)
        clearTimeout(drawTimeout);
    drawTimeout = setTimeout(function() {
        drawTimeout = undefined;
        draw();
    }, 60000 - (Date.now() % 60000));
}

// X/Y are the position of the bottom right of the HH:MM text - make it central!
function draw() {
    // work out how to display the current time
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var time = ("0"+h).substr(-2) + ":" + m.toString().padStart(2,0);

    // Reset the state of the graphics library
    g.reset();
    g.setBgColor(0.25, 0, 0).clearRect(X_LEFT, Y_CLOCK, X_RIGHT, Y_CLKINFO);
    // draw the current time
    g.setFont("Vector", H_CLOCK);
    g.setFontAlign(0,-1);    // Align centre-x, top-y
    g.drawString(time, X_CENTRE, Y_CLOCK, true /* clear bg */);

    // draw the date
    g.setFont("Teletext10x18Mode7",1);
    g.setFontAlign(0,-1);
    g.drawString(locale.dow(d,1)+' '+locale.date(d,1).substr(0,5), X_CENTRE, Y_DATE, true /* clear bg */);
    queueDraw();
}

Bangle.setUI("clock");
// Clear the screen once, at startup
g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

const rect = Bangle.appRect;
const X_LEFT = rect.x;
const X_WIDTH = rect.w;
const X_RIGHT = rect.x2;
const X_CENTRE = X_LEFT + X_WIDTH/2;
const Y_SPACER = 1;
const X_SPACER = 1;
const Y_TOP = rect.y;
const Y_CLOCK = Y_TOP+Y_SPACER;
const H_CLOCK = 50;
const Y_DATE = Y_CLOCK+H_CLOCK;
const Y_CLKINFO = Y_DATE+16+Y_SPACER;
const Y_BOTTOM = rect.y2;
const H_WIDE_CLKINFO = 30;
const Y_WIDE_CLKINFO = Y_BOTTOM - H_WIDE_CLKINFO;
const H_CLKINFO = Y_BOTTOM - Y_CLKINFO - H_WIDE_CLKINFO - Y_SPACER*2;
const N_CLKINFO = 3;
const W_CLKINFO = (X_WIDTH - 2*N_CLKINFO*X_SPACER)/N_CLKINFO;
const NEXTX_CLKINFO = W_CLKINFO + 2*X_SPACER;
const FIRSTX_CLKINFO = rect.x + X_SPACER;

const clock_info = require("clock_info");
let clockInfoItems = clock_info.load();
const draw_clk_info = (itm, info, options) => {
    g.reset().setBgColor(0,0,0.25).clearRect(options.x, options.y, options.x+options.w-2, options.y+options.h-1);
    if (options.focus)
        g.drawRect(options.x, options.y, options.x+options.w-2, options.y+options.h-1);
    var midx = options.x+options.w/2;
    let y=options.y;
    if (info.img)
    {
        g.drawImage(info.img, midx-12, options.y+4);
        y += g.imageMetrics(info.img).height + 5;
    }
    let text = info.text.toString();
    // Remove bpm from heart rate
    if (text.endsWith(" bpm")) {
        text = text.substr(0, text.length-4);
    }
    // Normalise any clock outputs to 24 hour, 4 digit
    if (text.charAt(2)==":" && text.length==5) {
        text = text.replace(":","").trim().padStart(4, "0");
    }
    // Select the best font for the length of string
    if (text.length > options.w/12) {
        g.setFont("8x16",1);
    } else {
        g.setFont("Teletext10x18Mode7");
    }
    g.setFontAlign(0,-1);
    // Wrap and truncate anything that's still too long
    if (text.length > options.w/6) {
        let text_lines = g.wrapString(text, options.w);
        for (let i=0; i<text_lines.length; i++) {
            let line=text_lines[i];
            g.setFontAlign(-1,-1);
            g.drawString(line.substr(0, options.w/6), options.x, y);
            y += 12+3;
            if (y>Y_BOTTOM) {
                break;
            }
        }
    } else {
        g.drawString(text, midx, y);
    }
}

for (let x=FIRSTX_CLKINFO; x<X_RIGHT; x+=NEXTX_CLKINFO) {
    clock_info.addInteractive(clockInfoItems,  {
        x: x, y: Y_CLKINFO, w: W_CLKINFO, h: H_CLKINFO,
        draw : draw_clk_info
    });
}

clock_info.addInteractive(clockInfoItems, {
    x: X_LEFT, y: Y_WIDE_CLKINFO, w: X_WIDTH, h: H_WIDE_CLKINFO,
    draw : (itm, info, options) => {
        g.reset().setBgColor(0,0.25,0).clearRect(options.x, options.y, options.x+options.w-2, options.y+options.h-1);
        if (options.focus)
            g.drawRect(options.x, options.y, options.x+options.w-2, options.y+options.h-1);
        let x = options.x;
        let midy = options.y + options.h/2;
        if (info.img)
        {
            g.drawImage(info.img, x, midy-g.imageMetrics(info.img).height/2);
            x += g.imageMetrics(info.img).width + 2;
        }
        // Select the best font for the length of string
        if (info.text.length > options.w/12) {
            g.setFont("6x12",2);
        } else {
            g.setFont("6x8:2");
        }
        g.setFontAlign(-1,0);
        g.drawString(info.text, x, midy);
    }
});

// draw, further draws will be scheduled therein
draw();


