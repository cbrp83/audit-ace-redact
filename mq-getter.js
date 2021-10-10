'use strict';

// based on https://github.com/ibm-messaging/mq-mqi-nodejs/blob/master/samples/amqsgeta.js

// TODO: fix "this" vs "parent" mess

// Import the MQ package
var mq = require('ibmmq');
var MQC = mq.MQC; // Want to refer to this export directly for simplicity

// Sample params:
// ("localhost(1414)", "DEV.APP.SVRCONN", "QM1", "DEV.QUEUE.1", someUser", "somePassword", someFunc)
function MqGetter(connectionName, channelName, qMgr, qName,
  userId, password, strCallBack) {

  this.ok = true;
  this.connectionHandle;
  this.queueHandle;
  // The default queue manager and queue to be used
  this.msgId = null;

  this.StringDecoder = require('string_decoder').StringDecoder;
  this.decoder = new this.StringDecoder('utf8');
  this.exitCode = 0;
  // this is not for polling the queue, it's for periodically checking "this.ok" based on
  // queue activity
  this.waitInterval = 10;
  this.strCallBack = strCallBack;


  this.startGetter = function() {    
    var chnDef = new mq.MQCD();
    chnDef.ConnectionName = connectionName;
    chnDef.ChannelName = channelName;

    var secParams = new mq.MQCSP();
    secParams.UserId = userId;
    secParams.Password = password;

    var cnOpt = new mq.MQCNO();
    cnOpt.ClientConn = chnDef;
    cnOpt.SecurityParms = secParams;
    cnOpt.Options |= MQC.MQCNO_CLIENT_BINDING;

    mq.setTuningParameters({
      syncMQICompat: true
    });

    mq.Conn(qMgr, this.handleConn(this));

    //mq.Connx(qMgr, secParams, this.handleConn(this)); --CBRP

    // We need to keep the program active so that the callbacks from the
    // message handler are processed. This is one way to do it. Use the
    // defined waitInterval with a bit extra added and look for the
    // current status. If not OK, then close everything down cleanly.
    setInterval(function(parent) {
      return function() {
        //console.log("checking if ok ...");
        if (!parent.ok) {
          console.log("Exiting ...");
          parent.cleanup(parent, parent.connectionHandle, parent.queueHandle);
          process.exit(parent.exitCode);
        }
      }
    }(this), this.waitInterval * 1000);

  }

  // double function hack necessary to avoid this = undefined
  this.handleConn = function(parent) {
    return function(err, hConn) {
      if (err) {
        console.log("ERROR handleConn");
        console.log(parent.formatErr(err));
        parent.ok = false;
      } else {
        console.log("MQCONN to %s successful ", qMgr);
        parent.connectionHandle = hConn;

        // Define what we want to open, and how we want to open it.
        var objDesc = new mq.MQOD();
        objDesc.ObjectName = qName;
        objDesc.ObjectType = MQC.MQOT_Q;
        var openOpts = MQC.MQOO_INPUT_AS_Q_DEF;
        mq.Open(hConn, objDesc, openOpts, function(err, hObj) {
          parent.queueHandle = hObj;
          if (err) {
            console.log(formatErr(err));
          } else {
            console.log("MQOPEN of %s successful", qName);
            // And now we can ask for the messages to be delivered.
            parent.getMessages();
          }
        });
      }
    }
  }

  this.getMessages = function() {
    var getMOpts = new mq.MQGMO();
    getMOpts.Options = MQC.MQGMO_NO_SYNCPOINT |
      MQC.MQGMO_WAIT |
      MQC.MQGMO_CONVERT |
      MQC.MQGMO_FAIL_IF_QUIESCING;
    getMOpts.MatchOptions = MQC.MQMO_NONE;
    getMOpts.WaitInterval = MQC.MQWI_UNLIMITED;

    var msgDesc = new mq.MQMD();
    mq.Get(this.queueHandle, msgDesc, getMOpts, this.getCallback(this));
  }


  this.getCallback = function(parent) {
    return function(err, hObj, gmo, md, buf, hConn) {
      // If there is an error, prepare to exit by setting the ok flag to false.
      if (err) {
        console.log("getCallback err");
        if (err.mqrc == MQC.MQRC_NO_MSG_AVAILABLE) {
          console.log("No more messages available.");
        } else {
          console.log(formatErr(err));
          parent.exitCode = 1;
        }
        parent.ok = false;
        // We don't need any more messages delivered, so cause the
        // callback to be deleted after this one has completed.
        mq.GetDone(hObj);
      } else {
        try {
          if (md.Format == "MQSTR") {
            var text = parent.decoder.write(buf);
            // TODO: remove log of unredacted data
            //console.log("message <%s>", text);
            parent.strCallBack(text);
          } else {
            console.log("binary message: " + buf);
          }
        } catch (err) {
          console.log(err.stack);
        }
      }
    }
  }

  this.formatErr = function(err) {
    console.log("formatErr " + err.message);
    if (err) {
      this.ok = false;
      return "MQ call failed at " + err.message;
    } else {
      return "MQ call successful";
    }
  }

  this.hexToBytes = function(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
  }


  this.cleanup = function(parent, hConn, hObj) {
    mq.Close(hObj, 0, function(err) {
      if (err) {
        console.log(parent.formatErr(err));
      } else {
        console.log("MQCLOSE successful");
      }
      mq.Disc(hConn, function(err) {
        if (err) {
          console.log(parent.formatErr(err));
        } else {
          console.log("MQDISC successful");
        }
      });
    });
  }
}

module.exports = MqGetter;