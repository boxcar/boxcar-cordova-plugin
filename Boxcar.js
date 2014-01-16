var Boxcar = {
    /**
     * Initialize push module
     *
     * @param data.clientKey
     * @param data.secret
     * @param data.server
     */
    init: function(data) {
        var verifyTo = {clientKey: 0, secret: 0, server: 0, richUrlBase:0};
        if (device.platform == 'android' || device.platform == 'Android')
            verifyTo.androidSenderID = 0;

        this._verifyArgs(data, verifyTo);

        this.server = data.server;
        this.clientKey = data.clientKey;
        this.secret = data.secret;
        this.androidSenderID = data.androidSenderID;
        this.richUrlBase = data.richUrlBase;

        this.initDb();
    },

    initDb: function() {
        if (this.db)
            return;

        try {
            this.db = window.openDatabase("Boxcar", "", "Boxcar db", 1000000);
            if (this.db.version == "1.0" || !this.db.version)
                this.db.changeVersion(this.db.version, "1.1", function(tx) {
                    tx.executeSql("CREATE TABLE IF NOT EXISTS pushes ("+
                                  "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"+
                                  "time INTEGER NOT NULL,"+
                                  "body STRING NOT NULL,"+
                                  "badge STRING NOT NULL,"+
                                  "sound STRING NOT NULL,"+
                                  "richPush INTEGER NOT NULL," +
                                  "url STRING," +
                                  "flags INTEGER NOT NULL" +
                                  ");");
                    tx.executeSql("CREATE INDEX pushes_on_time ON pushes (time);");
                }, function(a){console.info(a)}, function(a){console.info(a)});
        } catch (ex) {
        }
    },

    registerDevice: function(data) {
        this._verifyArgs(data, {mode: 0, onsuccess: 0, onerror: 0, onalert: 0});

        this._rdData = data;
        this.onalert = data.onalert;

        if (device.platform == 'android' || device.platform == 'Android')
            window.plugins.pushNotification.register(this._PNRegSuccess, this._PNRegError,
                                                     {senderID: this.androidSenderID, ecb:"Boxcar.GCM_Listener",
                                                      messageField: "aps-alert", msgcntField: "aps-badge",
                                                      deliverAllPushes: true});
        else
            window.plugins.pushNotification.register(function(arg){Boxcar._PNRegDone(arg)}, this._PNRegError,
                                                     {"badge":"true", "sound":"true", "alert":"true",
                                                      "ecb":"Boxcar.APN_Listener"});
    },

    unregisterDevice: function(data) {
        this._verifyArgs(data, {onsuccess: 0, onerror: 0});

        if (!this.regid)
            data.onsuccess();

        this._sendRequest("DELETE", "/api/device_tokens/"+this.regid,
                          {},
                          function() {
                              window.plugins.pushNotification.unregister(data.onsuccess, data.onerror);
                          },
                          data.onerror);
        this.regid = null;
    },

    getReceivedMessages: function(data) {
        this._verifyArgs(data, {onsuccess: 0, onerror: 0});

        this.db.transaction(function(tx) {
            var sql = "SELECT id, time, body, badge, sound, richPush, url, flags FROM pushes";
            var args = [];
            if (data.before) {
                sql += " WHERE time < ?";
                args.push(data.before);
            }

            sql += " ORDER BY time DESC";

            if (data.limit) {
                sql += " LIMIT ?";
                args.push(data.limit);
            }
            tx.executeSql(sql, args, function(tx, results) {
                var len = results.rows.length;
                var res = [];
                for (var i = 0; i < len; i++) {
                    var rp = results.rows.item(i).richPush;
                    if (rp == "false")
                        rp = false;
                    res.push({
                                 id: results.rows.item(i).id,
                                 time: results.rows.item(i).time,
                                 body: results.rows.item(i).body,
                                 badge: results.rows.item(i).badge,
                                 sound: results.rows.item(i).sound,
                                 richPush: rp,
                                 url: results.rows.item(i).url
                             })
                }
                data.onsuccess(res);
            });
        }, function() {}, onerror);

    },

    getTags: function(data) {
        this._verifyArgs(data, {onsuccess: 0, onerror: 0});

        if (this._tags)
            data.onsuccess(this._tags);

        this._sendRequest("GET", "/api/tags",
                          {},
                          function(recv) {
                              try {
				  if (recv == "")
				      Boxcar._tags = [];
				  else
				      Boxcar._tags = JSON.parse(recv).ok;

                                  data.onsuccess(Boxcar._tags);
                              } catch (ex) {
                                  data.onerror({error: "Can't parse response"});
                              }
                          },
                          data.onerror);
    },

    resetBadge: function(data) {
        this._verifyArgs(data, {onsuccess: 0, onerror: 0});

        if (!this.regid)
            data.onerror({error: "Device not registered in push service"});

        this._sendRequest("GET", "/api/reset_badge/"+this.regid,
                          {},
                          data.onsuccess,
                          data.onerror);

    },

    markAsReceived: function(data) {
        this._verifyArgs(data, {onsuccess: 0, onerror: 0, id: 0});

        if (!this.regid)
            data.onerror({error: "Device not registered in push service"});

        this._sendRequest("POST", "/api/receive/"+this.regid,
                          {id: data.id},
                          data.onsuccess,
                          data.onerror);
    },

    _verifyArgs: function(args, names, defaults) {
        if (!args)
            throw new Error("Invalid Argument");

        if (device.platform == 'android' || device.platform == 'Android')
            for (var i in args.android || {})
                args[i] = args.android[i];
        else
            for (var i in args.ios || {})
                args[i] = args.ios[i];

        for (var i in names)
            if (!(i in args))
                throw new Error("Invalid Argument - "+i);
        if (defaults)
            for (i in defaults)
                if (!(i in args))
                    args[i] = defaults[i];
        return null;
    },

    _PNRegSuccess: function() {
        console.info("ServiceOp success")
    },

    _PNRegError: function(arg) {
        console.info("ServiceOp failed", arg)
    },

    _PNRegDone: function(regid) {
        this.regid = regid;

        var fields = {mode: this._rdData.mode};

        if (this._rdData.tags)
            fields.tags = this._rdData.tags;
        if (this._rdData.udid)
            fields.tags = this._rdData.udid;
        if (this._rdData.alias)
            fields.alias = this._rdData.alias;

        this._sendRequest("PUT", "/api/device_tokens/"+regid,
                          fields,
                          this._rdData.onsuccess,
                          this._rdData.onerror);
    },

    _sendRequest: function(method, url, data, success, error, expires) {
        if (!expires)
            expires = 5*60*1000;

        var empty = true;
        for (var i in data)
            empty = false;

        var dataStr;

        if (empty) {
            dataStr = "";
        } else {
             expires += Date.now();
             data.expires = expires;

             dataStr = JSON.stringify(data);
        }

        var signData = method+"\n"+
            this.server.replace(/^(?:\w+:\/\/)?([^:]*?)(?::\d+)?(?:\/.*)?$/, "$1").toLowerCase()+"\n"+
            url+"\n"+
            dataStr;
        var signature = this.crypto.sha1_hmac(this.secret, signData);

        console.info("Sending to "+this.server+url+"?clientkey="+this.clientKey+"&signature="+signature+
        " data: "+dataStr+ " signData: "+signData)

        var req = new XMLHttpRequest();
        req.open(method, this.server+url+"?clientkey="+this.clientKey+"&signature="+signature);
        req.setRequestHeader("Content-type", "application/json");
        req.onreadystatechange = function() {
            console.info("GOT RES: "+ req.readyState+", "+req.status+", "+req.responseText);
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0 || req.status == 204)
                    success(req.responseText);
                else
                    error(req.status, req.responseText);
            }
        }
        req.send(dataStr);
    },

    _gotMessage: function(msg) {
        var _this = this;
        this.db.transaction(function(tx) {
            tx.executeSql("INSERT INTO pushes (id, time, body, badge, sound, richPush, url, flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                          [+msg.id, msg.time, msg.body, msg.badge, msg.sound, msg.richPush, msg.url, 0]);
        }, Boxcar._PNRegError, function() {_this.onalert(msg)});
    },

    crypto: {
        string2bin: function(data) {
            var ret = new Array(data.length>>2);
            var i;

            for (i = 0; i < data.length; i+=4)
                ret[i>>2] = ((data.charCodeAt(i) & 0xff) << 24) |
                            ((data.charCodeAt(i+1) & 0xff) << 16) |
                            ((data.charCodeAt(i+2) & 0xff) << 8) |
                            (data.charCodeAt(i+3) & 0xff);
            for (; i < data.length; i++)
                ret[i>>2] |= (data.charCodeAt(i) & 0xff) << ((i%4)<<3);
            return ret;
        },

        bin2hex: function(data) {
            var hexchars = "0123456789abcdef";
            var ret = "";

            for (var i = 0; i < data.length; i++) {
                ret+= hexchars.charAt((data[i]>>28)&0xf)+hexchars.charAt((data[i]>>24)&0xf)+
                      hexchars.charAt((data[i]>>20)&0xf)+hexchars.charAt((data[i]>>16)&0xf)+
                      hexchars.charAt((data[i]>>12)&0xf)+hexchars.charAt((data[i]>>8)&0xf)+
                      hexchars.charAt((data[i]>>4)&0xf)+hexchars.charAt(data[i]&0xf)
            }
            return ret;
        },

        madd: function(x, y) {
            return ((x&0x7FFFFFFF) + (y&0x7FFFFFFF)) ^ (x&0x80000000) ^ (y&0x80000000);
        },

        bitroll: function(x, r) {
            return (x << r) | (x >>> (32-r));
        },

        sha1_ft: function(t, b, c, d) {
            if(t < 20)
                return (b & c) | ((~b) & d);
            if(t < 40)
                return b ^ c ^ d;
            if(t < 60)
                return (b & c) | (b & d) | (c & d);
            return b ^ c ^ d;
        },

        sha1_bin: function(data, length) {
            var W = new Array(80);
            var A, B, C, D, E;
            var A2, B2, C2, D2, E2;
            var i, t, tmp;
            var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];

            data[length >> 5] |= 0x80 << (24 - length % 32);
            data[((length + 64 >> 9) << 4) + 15] = length;

            A = 0x67452301;
            B = 0xefcdab89;
            C = 0x98badcfe;
            D = 0x10325476;
            E = 0xc3d2e1f0;

            for (i = 0; i < data.length; i+=16) {
                A2 = A;
                B2 = B;
                C2 = C;
                D2 = D;
                E2 = E;
                for (t = 0; t < 80; t++) {
                    W[t] = t < 16 ? data[t+i] :
                           this.bitroll(W[t-3] ^ W[t-8] ^ W[t- 14] ^ W[t-16], 1);
                    tmp = this.madd(this.madd(this.bitroll(A, 5), this.sha1_ft(t, B, C, D)),
                                    this.madd(this.madd(E, W[t]), K[Math.floor(t/20)]));

                    E = D;
                    D = C;
                    C = this.bitroll(B, 30);
                    B = A;
                    A = tmp;
                }
                A = this.madd(A, A2);
                B = this.madd(B, B2);
                C = this.madd(C, C2);
                D = this.madd(D, D2);
                E = this.madd(E, E2);
            }
            return new Array(A, B, C, D, E);
        },

        sha1_hmac_bin: function(key, data) {
            var bkey = this.string2bin(key, true);
            if (bkey.length > 16)
                bkey = this.sha1_bin(bkey, key.length * 8);

            var ipad = Array(16), opad = Array(16);
            for(var i = 0; i < 16; i++) {
                ipad[i] = bkey[i] ^ 0x36363636;
                opad[i] = bkey[i] ^ 0x5C5C5C5C;
            }

            var hash = this.sha1_bin(ipad.concat(this.string2bin(data)), 512 + data.length * 8);

            return this.sha1_bin(opad.concat(hash), 512 + 160);
        },
        sha1: function sha1(data) {
            return this.bin2hex(this.sha1_bin(this.string2bin(data), data.length*8));
        },

        sha1_hmac: function sha1_hmac(key, data) {
            return this.bin2hex(this.sha1_hmac_bin(key, data));
        }
    },

    GCM_Listener: function(data) {
        console.log("GCM_Listener",data);
        switch (data.event) {
            case "registered":
                Boxcar._PNRegDone(data.regid);
                break;
            case "message":
                var msg = {
                    id: data.payload["i"],
                    time: Date.now(),
                    sound: data.payload["aps-sound"],
                    badge: parseInt(data.payload["aps-badge"]) || 0,
                    body: data.payload["aps-alert"],
                    richPush: data.payload["f"] == "1",
                    url: data.payload["f"] == "1" ?
                         this.richUrlBase+"/push-"+data.payload["i"]+".html" :
                         data.payload["u"]
                }
                Boxcar._gotMessage(msg);
                break;
        }
    },

    APN_Listener: function(data) {
        console.log("APN_Listener",data);
        try{
        var msg = {
            id: data.i,
            time: Date.now(),
            sound: data.sound,
            badge: parseInt(data.badge) || 0,
            body: data.alert,
            richPush: data.f == "1",
            url: data.f == "1" ?
                 Boxcar.richUrlBase+"/push-"+data.i+".html" :
                 data.u
        };

        if (msg.badge)
            window.plugins.pushNotification.setApplicationIconBadgeNumber(function(){}, function(){}, msg.badge);
        }catch(ex){console.info("EX ", ex)}

        Boxcar._gotMessage(msg);
    }
}

if (typeof(module) != "undefined")
    module.exports = Boxcar;
