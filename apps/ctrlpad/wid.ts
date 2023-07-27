(() => {
	const settings = require("Storage").readJSON("setting.json", true) as Settings || ({ HID: false } as Settings);
	if (settings.HID !== "kbmedia") {
		console.log("widhid: can't enable, HID setting isn't \"kbmedia\"");
		return;
	}
	// @ts-ignore
	delete settings;

	const enum State {
		NoConn,
		Idle,
		TopDrag,
		IgnoreCurrent,
		Active,
	}
	let state = State.NoConn;
	let startY = 0;
	const initDistance = 30;

	let anchor = {x:0,y:0};
	let start = {x:0,y:0};
	let dragging = false;
	let activeTimeout: TimeoutId | undefined;
	let waitForRelease = true;

	const onDrag = (e => {
		console.log("onDrag, state = " + state);
		switch (state) {
			case State.NoConn:
				break;

			case State.IgnoreCurrent:
                if(e.b === 0) state = State.Idle;
                break;

			case State.Idle:
				if(e.b && !activeTimeout){ // no need to check Bangle.CLKINFO_FOCUS
					// first touch
					if (e.y <= 24){
						state = State.TopDrag
						startY = e.y;
						console.log("  topdrag detected, starting @ " + startY);
					}else{
						console.log("  ignoring this drag (too low @ " + startY + ")");
						state = State.IgnoreCurrent;
					}
				}
				break;

			case State.TopDrag:
				if(e.b === 0){
					console.log("topdrag stopped, distance: " + (e.y - startY));
					if(e.y > startY + initDistance){
						state = State.Active;
						listen();
						Bangle.buzz(20);
						break;
					}
					state = State.Idle;
					Bangle.setLCDOverlay();
				}else{
					// partial drag, show UI feedback:
					const height = 100;
					const g2 = Graphics.createArrayBuffer(100, height, 1, { msb:true });
					g2.drawLine(0, 0, 100, 100);
					g2.drawRect(0, 0, 99, 99);
					g2.drawString("widhid", 0, 0);
					Bangle.setLCDOverlay(g2, 38, e.y - height - 30);
				}
				break;

			case State.Active:
				console.log("stolen drag handling, do whatever here");
                return;
				// Espruino/35c8cb9be11
				E.stopEventPropagation && E.stopEventPropagation();

				if(e.b === 0){
					// released
					const wasDragging = dragging;
					dragging = false;

					if(waitForRelease){
						waitForRelease = false;
						return;
					}

					if(!wasDragging // i.e. tap
					|| (Math.abs(e.x - anchor.x) < 2 && Math.abs(e.y - anchor.y) < 2))
					{
						toggle();
						onEvent();
						return;
					}
				}
				if(waitForRelease) return;

				if(e.b && !dragging){
					dragging = true;
					setStart(e);
					Object.assign(anchor, start);
					return;
				}

				const dx = e.x - start.x;
				const dy = e.y - start.y;

				if(Math.abs(dy) > 25 && Math.abs(dx) > 25){
					// diagonal, ignore
					setStart(e);
					waitForRelease = true;
					return;
				}

				// had a drag in a single axis
				if(dx > 40){       next(); onEvent(); waitForRelease = true; }
				else if(dx < -40){ prev(); onEvent(); waitForRelease = true; }
				else if(dy > 30){  down(); onEvent(); setStart(e); }
				else if(dy < -30){ up();   onEvent(); setStart(e); }
				break;
		}
	}) satisfies DragCallback;

	const setStart = ({ x, y }: { x: number, y: number }) => {
		start.x = x;
		start.y = y;
	};

	const onEvent = () => {
		Bangle.buzz(20); // feedback event sent
		listen(); // had an event, keep listening for more
	};

	const listen = () => {
		const wasActive = !!activeTimeout;
		if(!wasActive){
			waitForRelease = true; // wait for first touch up before accepting gestures

			//Bangle.on("drag", onDrag);

			// move our drag to the start of the event listener array
			const dragHandlers = (Bangle as BangleEvents)["#ondrag"]

			if(dragHandlers && typeof dragHandlers !== "function"){
				(Bangle as BangleEvents)["#ondrag"] = [onDrag as undefined | typeof onDrag].concat(
					dragHandlers.filter((f: unknown) => f !== onDrag)
				);
			}

			redraw();
		}

		if(activeTimeout) clearTimeout(activeTimeout);
		activeTimeout = setTimeout(() => {
			activeTimeout = undefined;

			//Bangle.removeListener("drag", onDrag);

			redraw();
		}, 3000);
	};

	Bangle.on("drag", onDrag);

	const redraw = () => setTimeout(Bangle.drawWidgets, 50);

	const connected = NRF.getSecurityStatus().connected;
	WIDGETS["hid"] = {
		area: "tr",
		sortorder: -20,
		draw: function() {
			if(this.width === 0) return;
			g.drawImage(
				activeTimeout
				? require("heatshrink").decompress(atob("jEYxH+AEfH44XXAAYXXDKIXZDYp3pC/6KHUMwWHC/4XvUy4YGdqoA/AFoA=="))
				: require("heatshrink").decompress(atob("jEYxH+AEcdjoXXAAYXXDKIXZDYp3pC/6KHUMwWHC/4XvUy4YGdqoA/AFoA==")),
				this.x! + 2,
				this.y! + 2
			);
		},
		width: connected ? 24 : 0,
	};

	state = connected ? State.Idle : State.NoConn;

	// @ts-ignore
	delete connected;

	NRF.on("connect", () => {
		WIDGETS["hid"]!.width = 24;
		state = State.Idle;
		redraw();
	});
	NRF.on("disconnect", () => {
		WIDGETS["hid"]!.width = 0;
		state = State.NoConn;
		redraw();
	});

	//const DEBUG = true;
	const sendHid = (code: number) => {
		//if(DEBUG) return;
		try{
			NRF.sendHIDReport(
				[1, code],
				() => NRF.sendHIDReport([1, 0]),
			);
		}catch(e){
			console.log("sendHIDReport:", e);
		}
	};

	const next = () => /*DEBUG ? console.log("next") : */ sendHid(0x01);
	const prev = () => /*DEBUG ? console.log("prev") : */ sendHid(0x02);
	const toggle = () => /*DEBUG ? console.log("toggle") : */ sendHid(0x10);
	const up = () => /*DEBUG ? console.log("up") : */ sendHid(0x40);
	const down = () => /*DEBUG ? console.log("down") : */ sendHid(0x80);
})()
