<link href="http://kevinburke.bitbucket.org/markdowncss/markdown.css" rel="stylesheet"></link>

# General information about API

All functions take single argument, object with properties recognized by
each individual API point entry. Those functions will throw error when
one or more of required parameters are missing. All result will be delivered
asynchronously, by executing callback functions passed as arguments to API calls.

# Application live cycle

Before any other operation can be performed, Boxcar API must be
initialized, this is performed by calling `Boxcar.init()`.

After that application can register retrieve list of tags by using `Boxcar.getTags()`
or skip that step if interesting tags are already known.

To make device receive push notificaitons `Boxcar.registerDevice()` must be called, after
that all new notificaitons are delivered to applications by executing `onalert` callback
provided in that API call

# Starting new project using API

Make sure that on machine where build will be performed [Apache Cordova][http://cordova.apache.org/], and
Android or/and IOS SDK installed.

As first step, we need to create new cordova project using:
    cordova create /path/to/our-project our.domain.testapp1 "Test Applicaton"

After that we need to switch to app directory:
    cd /path/to/our-project

Next we need to declare for what platforms we want build our application:
    cordova platform add android
    cordova platform add ios

Then we need to download plugins required by Boxcar SDK
    cordova plugin add org.apache.cordova.websql # This plugin is only required for Android applications
    cordova plugin add org.apache.cordova.device
    cordova plugin add https://github.com/boxcar/PushPlugin

After that we need put our program files together with `Boxcar.js` file in www/ directory.
We also need to include `Boxcar.js` and `PushNotification.js` file in our `index.html` file.
    <script type="text/javascript" charset="utf-8" src="PushNotification.js"></script>
    <script type="text/javascript" charset="utf-8" src="Boxcar.js"></script>

This will let us generate packages for our target system with:
    cordova build android
    cordova build ios

and deploy those applications on configured devices using:
    cordova serve android
    cordova serve ios

# API calls

## `Boxcar.init()`

This method initializes internal structures, and archived notifications database

Arguments:

* `clientKey` (required) - Key used to access service,
* `secret` - (required) - Secret value needed to access service
* `server` - (required) - Url of push bridge server
* `androidSenderID` - (android only) - Google project id used to register for push notification
* `richUrlBase` - Url of server where html content of received pushes are available

## `Boxcar.registerDevice()`

This method register device in push service, making it be able to receive new pushes

Arguments:

* `mode` (required) - String with "production" or "development" telling push service if
production or development delivery channel should be used to register this device
* `onsuccess` (required) - Calback function called when device was successfully registered
in push service
* `onerror` (required) - Callback function called when device registration was unsuccessful,
it receives single String value is error description
* `onalert` (required) - Callback function called when new push message was received, it receive object
with properties initialized from notificaiton content
* `tags` - List of strings with tags used to filter which notifications should be delivered
* `udid` - Unique identifier of device where application is run
* `alias` - Friendly name of device where application is run

Object passed to `onalert` callback has those fields:

* `id` - unique identifier of push notification
* `time` - time in miliseconds since epoch of when this message was received, this value can be
converted to Date object by calling `new Date(msg.time)`
* `sound` - string identifer of sound which should be played with notification
* `badge` - number of unread messages on server
* `body` - body of push notification
* `richPush` - boolean value telling if this push includes html formated content
* `url` - url to html content include in this push

## `Boxcar.unregisterDevice()`

Unregister device from push notifications

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receivessingle String with error message

## `Boxcar.getTags()`

This method retrieves list of tags assigned to push notification channel from server

Arguments:

* `onsuccess` (required) - Callback function called when list of tags was retrieved, it receives
one argument, list of strings with all tags assigned on server
* `onerror` (required) - Callback function, it's called on error with single String with error message

## `Boxcar.markAsReceived()`

Inform push service that push message was seen by user

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receivessingle String with error message
* `id` (required) - String identifier of push notification to mark as received

## `Boxcar.resetBadge()`

Reset count of notificaitons to zero

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receivessingle String with error message

## `Boxcar.getReceivedMessages()`

Retrieves list of received messages from device storage. Messages are delivered from newest to oldest.

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed, this function receives
single argument with list of notifications object described in `Boxcar.registerDevice()`
* `onerror` (required) - Callback function, it's called when error happen, receivessingle String with error message
* `before` - Number with timestamp, it will make this function return only messages newer than date from timestamp
* `limit` - Maximum number of messages which should be returned
