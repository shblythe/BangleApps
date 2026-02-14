(function() {
    let text = "Waiting...";
    const UPDATE_INTERVAL = 10 * 60 * 1000;
    let updateTimeout = undefined;

    const update_off = () => {
        if (updateTimeout) {
            console.log("update_off");
            clearTimeout(updateTimeout);
            updateTimeout=undefined;
        }
    }

    const update_on = (redraw) => {
        update_off();
        console.log("update_on");
        updateTimeout=setTimeout(() => update_text(redraw), UPDATE_INTERVAL);
    }

    function update_text(redraw) {
        console.log("updating leaderboard");
        const config = require("Storage").readJSON("clkinfostepsrest.json",1)||{};
        Bangle.http(config.url,{method:'get'}).then(data=>{
            const resp = JSON.parse(data.resp);
            let output = "";
            for (let player of resp.players) {
                output +=
                    player.name.substr(0,1)+" " +
                    player.steps+"\n";
            }
            text = output;
            redraw();
        }).catch(e=>{
            console.log(e);
            text = "Error";
            redraw();
        });
        update_on(redraw);
    }

    return {
        name: "BangleSteps",
        // img: 24x24px image for this list of items. The default "Bangle" list has its own image so this is not needed
        items: [
            {
                name : "Steps",
                get : () => {
                    let steps = 0;
                    require("health").readDay(new Date(), (h) => steps+=h.steps);
                    return ({
                        text: steps,
                        img : atob("GBiBAAcAAA+AAA/AAA/AAB/AAB/gAA/g4A/h8A/j8A/D8A/D+AfH+AAH8AHn8APj8APj8AHj4AHg4AADAAAHwAAHwAAHgAAHgAADAA=="),
                    });
                },
                show : function() {
                    this.interval = setInterval(()=>this.emit('redraw'), 10000);
                },
                hide : function() {
                    clearInterval(this.interval);
                    delete this.interval;
                },
            },
            {
                name : "Leaderboard",
                get : () => {
                    console.log("drawing leaderboard");
                    return ({text: text});
                },
                show : function() {
                    update_text(() => this.emit("redraw"));
                },
                hide : () => {
                    update_off();
                },
                // run : function() {} optional (called when tapped)
                // focus : function() {} optional (called when focussed)
                // blur : function() {} optional (called when unfocussed)
            }
        ]
    };
// next line must not have a semi-colon at the end!
})
