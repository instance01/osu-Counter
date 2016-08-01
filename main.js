
const {app, BrowserWindow} = require('electron')
let win

function createWindow () {
	win = new BrowserWindow({width: 600, height: 400, frame: false, maximizable: false, fullscreenable: false})
	win.loadURL(`file://${__dirname}/index.html`)
	//win.webContents.openDevTools()
	win.on('closed', () => {
		saveStats();
		win = null
	})
}

app.on('ready', createWindow)


// Events/Keys
var key1;
var key2;
var setting_key = false;
var current_key = "1";
var current_event;

var key1count = 0;
var key2count = 0;
var key1wasdown = false;
var key2wasdown = false;

var oldStats;

const {ipcMain} = require('electron')

ipcMain.on('buttonclick', (event, arg) => {
	current_event = event;
	setting_key = true;
	if(arg == "key1"){
		current_key = "1";
	} else if(arg == "key2"){
		current_key = "2";
	}
})


// Files/Settings
var fs = require('fs');

function saveConfig(str){
	fs.writeFile(app.getAppPath() + "/save.conf", str, function(err) {
		if(err) {
			return console.log(err);
		}
	}); 
}

function saveStats(){
	console.log("Saving stats..");
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();
	if(dd<10) {
		dd='0'+dd
	}
	if(mm<10) {
		mm='0'+mm
	}
	today = mm+'/'+dd+'/'+yyyy; // I'll just keep it at the US format
	var found = false;
	for(i = 0; i < oldStats.length; i++){
		if(oldStats[i].date == today){
			oldStats[i].keycount += key1count + key2count;
			found = true;
		}
	}
	if(!found){
		oldStats.push({"date": today, "keycount": key1count + key2count})
	}

	fs.writeFile(app.getAppPath() + "/stats.json", JSON.stringify(oldStats), function(err) {
		if(err) {
			return console.log(err);
		}
	}); 
	console.log("Done");
}

ipcMain.on('loadbuttons', (event, arg) => {
	try {
		var contents = fs.readFileSync(app.getAppPath() + "/save.conf", "utf8");
		if(contents.length > 0){
			keys = contents.split(/\r?\n/);
			key1 = parseInt(keys[0]);
			key2 = parseInt(keys[1]);
			event.sender.send("buttonclick_reply_key1", key1);
			event.sender.send("buttonclick_reply_key2", key2);
		}
	} catch (e) {
		console.log(e);
	}
});

ipcMain.on('loadstats', (event, arg) => {
	try {
		var contents = fs.readFileSync(app.getAppPath() + "/stats.json", "utf8");
		if(contents.length > 0){
			oldStats = JSON.parse(contents);
			event.sender.send("loadstats_reply", contents);
		}
	} catch (e) {
		console.log(e);
		oldStats = JSON.parse("[]")
	}
});


// Other
ipcMain.on("exitbtn", (event, arg) => {
	win.close();
});

// GetAsyncKeyState
var FFI = require('ffi');

var user32 = new FFI.Library('user32', {
	'GetAsyncKeyState': ['int32', ['int32']]
});

setInterval(function() {
	for (var i = 9; i < 255; ++i) {
		var state = user32.GetAsyncKeyState(i);
		if (state == -32767) {
			if(setting_key){
				if(current_key == "1") {
					current_event.sender.send('buttonclick_reply_key1', i);
					key1 = i;
					setting_key = false;
				} else if(current_key == "2"){
					current_event.sender.send('buttonclick_reply_key2', i);
					key2 = i;
					setting_key = false;
				}
				saveConfig(key1 + "\n" + key2);
			}
		}
	}
	
	if(key1 != null && key2 != null){
		if(user32.GetAsyncKeyState(key1) != 0){
			if(!key1wasdown){
				key1wasdown = true;
				key1count++;
				win.webContents.send("counter_update", "Key 1: " + key1count + "<br>Key 2: " + key2count)
			}
		} else {
			key1wasdown = false;
		}
		
		if(user32.GetAsyncKeyState(key2) != 0){
			if(!key2wasdown){
				key2wasdown = true;
				key2count++;
				win.webContents.send("counter_update", "Key 1: " + key1count + "<br>Key 2: " + key2count)
			}
		} else{
			key2wasdown = false;
		}	
	}
}, 10);
