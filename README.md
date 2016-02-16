<link href="http://kevinburke.bitbucket.org/markdowncss/markdown.css" rel="stylesheet"></link>

# General information about API

All functions take single argument, object with properties recognized by
each individual API point entry. Those functions will throw error when
one or more of required parameters are missing. All result will be delivered
asynchronously, by executing callback functions passed as arguments to API calls.

Arguments to all API calls can have `ios: {...}` or `android: {...}` sections, values
specified that way would overwrite general data from adequate platform section.

# Application life cycle

Before any other operation can be performed, Boxcar API must be
initialized, this is performed by calling `Boxcar.init()`.

After that application can register retrieve list of tags by using `Boxcar.getTags()`
or skip that step if interesting tags are already known.

To make device receive push notifications `Boxcar.registerDevice()` must be called, after
that all new notifications are delivered to applications by executing `onalert` callback
provided in that API call.

# Starting new project using API

Make sure that on machine where build will be performed [Apache Cordova][http://cordova.apache.org/], and
Android or/and IOS SDK installed.

As first step, we need to create new cordova project using:

~~~ bash
cordova create /path/to/our-project our.domain.testapp1 "Test Application"
~~~

After that we need to switch to app directory:

~~~ bash
cd /path/to/our-project
~~~

Next, we need to declare for what platforms we want build our application:

~~~ bash
cordova platform add android
cordova platform add ios
~~~

Then we need to download plugin containing Boxcar SDK and it's dependencies

~~~ bash
cordova plugin add https://github.com/boxcar/boxcar-cordova-plugin
~~~

Packages for iOS platform can be only build with Xcode IDE, executing:

~~~ bash
cordova prepare ios
~~~

will fill `platform/ios` directory which can be opened in Xcode.

Developing for Android can also be done using IDE environment, first by preparing build directory:

~~~ bash
cordova prepare android
~~~

and then creating IDE project from `platfrom/android` directory, but this can also be performed from
CLI by executing

~~~ bash
cordova build android
~~~

to build APK file, and calling

~~~ bash
cordova run android
~~~

to install and start application on Android device.

# API calls

## `Boxcar.init()`

This method initializes internal structures, and archived notifications database

Arguments:

* `clientKey` (required) - Key used to access service,
* `secret` - (required) - Secret value needed to access service
* `server` - (required) - Url of push bridge server
* `androidSenderID` - (required, android only) - Project number
  assigned to your application in Google Developers Console
* `richUrlBase` - (required) - Url of server where html content of received pushes are available
* `icon` - (optional, android only) - ID of android resource placed in `res/drawable/` with icon that can be used
  to display in your notifications
* `iconColor` - (optional, android only) - Color of notification icon background specified as `#RRGGBB`

## `Boxcar.registerDevice()`

This method register device in push service, making it be able to receive new pushes

Arguments:

* `mode` (required) - String with "production" or "development" telling push service if
production or development delivery channel should be used to register this device
* `onsuccess` (required) - Callback function called when device was successfully registered
in push service
* `onerror` (required) - Callback function called when device registration was unsuccessful,
it receives single String value is error description
* `onalert` (required) - Callback function called when new push message was received, it receive object
with properties initialized from notification content
* `onnotificationclick` (required) - Callback function called when user clicked on notification UI
generated from push. This event can be dispatched only for pushes received when app was in background,
as for pushes received when app was active notification is not displayed. This function is called with
single object argument with properties initialized from notification content
* `tags` - List of strings with tags used to filter which notifications should be delivered
* `udid` - Unique identifier of device where application is run
* `alias` - Friendly name of device where application is run
* `appVersion` - String with version of your application

Objects passed to `onalert` and `onnotificationclick` callbacks have those fields:

* `id` - unique identifier of push notification
* `time` - time in milliseconds since epoch of when this message was received, this value can be
converted to Date object by calling `new Date(msg.time)`
* `sound` - string identifier of sound which should be played with notification
* `badge` - number of unread messages on server
* `body` - body of push notification
* `richPush` - boolean value telling if this push includes html formated content
* `url` - url to html content include in this push
* `seen` - boolean value telling if `markAsReceived` was used for this push notification id
* `extras` - object containing values defined as "Extra Variables" in push console

## `Boxcar.unregisterDevice()`

Unregister device from push notifications

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receives single String with error message

## `Boxcar.getTags()`

This method retrieves list of tags assigned to push notification channel from server

Arguments:

* `onsuccess` (required) - Callback function called when list of tags was retrieved, it receives
one argument, list of strings with all tags assigned on server
* `onerror` (required) - Callback function, it's called on error with single String with error message

## `Boxcar.markAsReceived()`

Inform push service that push message was seen by user. This also makes message info returned
for further `Boxcar.getReceivedMessages()` to have `seen` attribute set to true

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receives single String with error message
* `id` (required) - String identifier of push notification to mark as received

## `Boxcar.resetBadge()`

Reset count of notificaitons to zero

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed
* `onerror` (required) - Callback function, it's called when error happen, receives single String with error message

## `Boxcar.getReceivedMessages()`

Retrieves list of received messages from device storage. Messages are delivered from newest to oldest.

Arguments:

* `onsuccess` (required) - Callback function called when operation was successfully completed, this function receives
single argument with list of notifications object described in `Boxcar.registerDevice()`
* `onerror` (required) - Callback function, it's called when error happen, receivessingle String with error message
* `before` - Number with timestamp, it will make this function return only messages newer than date from timestamp
* `limit` - Maximum number of messages which should be returned
