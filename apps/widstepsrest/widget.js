/* run widgets in their own function scope if they need to define local
variables so they don't interfere with currently-running apps */
(() => {
    WIDGETS["steprst"]={
        area:"tl",
        width:72,
        //width:0,
        last_push_attempt:0,
        last_push_steps:0,
        draw_interval: 3*60*1000,    // 3m
        push_interval:10*60*1000,    // 10m
        send:function(date) {
            // Do the push
            let steps = 0;
            require("health").readDay(date, (h) => steps+=h.steps);
            const config = require("Storage").readJSON("steprst.json")||{};
            const date_string = date.getFullYear()+"-"+(date.getMonth()+1).toString().padStart(2,'0')+
                                "-"+date.getDate().toString().padStart(2,'0')
            const post_url = config.url+date_string+"/"+steps;
            console.log(post_url);
            Bangle.http(post_url,{method:'post'}).then(data=>{
                console.log("Got ",data);
                this.last_push_steps="Y"+steps;
            }).catch(e=>{
                console.log("Err ",e);
                this.last_push_steps="N"+steps;
            });
        },
        draw:function() {
            if (Date.now() - this.last_push_attempt > this.draw_interval) {
                let d=new Date();
                this.send(d);
                d.setDate(d.getDate()-1);   // previous day
                this.send(d);
                this.last_push_attempt=Date.now();
            }
            g.reset();
            g.clearRect(this.x, this.y, this.x+this.width, this.y+23);
            g.setFont("6x8", 2);
            g.drawString(this.last_push_steps, this.x, this.y);
            // queue next update in one minute
            if (this.drawTimeout) clearTimeout(this.drawTimeout);
            this.drawTimeout = setTimeout(() => {
                this.drawTimeout = undefined;
                this.draw();
            }, this.push_interval - (Date.now() % this.push_interval));
        }
    };
})()

